/**
 * Evidence Consistency Auditor & Integrity Engine
 * 
 * Enforces strict consistency rules between deterministic matches, raw resume evidence,
 * and AI verifications. Guarantees that LLM hallucinations or false negatives never override
 * direct resume evidence.
 */

import { EvaluatedRequirement } from "./matcher";
import { SingleRequirementVerification } from "./schemas";
import { cleanKey, buildWordBoundaryRegex } from "./requirement-normalizer";

export interface EvidenceAuditOptions {
  evaluatedRequirements: EvaluatedRequirement[];
  rawResumeText: string;
  geminiVerifications?: SingleRequirementVerification[];
}

export interface AuditedEvidenceResult {
  requirements: EvaluatedRequirement[];
  humanReviewRecommended: boolean;
  humanReviewReasons: string[];
  overallConfidence: number;
}

/**
 * Audits and guarantees evidence consistency across all screened requirements.
 */
export function auditEvidenceConsistency(options: EvidenceAuditOptions): AuditedEvidenceResult {
  const { evaluatedRequirements, rawResumeText, geminiVerifications = [] } = options;
  const rawLower = (rawResumeText || "").toLowerCase();

  const humanReviewReasons: string[] = [];
  let totalConfidence = 0;

  const audited = evaluatedRequirements.map((req) => {
    // Locate corresponding Gemini verification if provided (strict requirementId first, title fallback)
    const geminiItem =
      geminiVerifications.find((g) => g.requirementId && g.requirementId === req.jobRequirementId) ||
      geminiVerifications.find(
        (g) => g.requirementTitle && cleanKey(g.requirementTitle) === cleanKey(req.requirementTitle)
      );

    let finalStatus = req.status;
    let finalEvidence = req.evidenceQuote || "";
    let finalReasoning = req.reasoning;
    let finalConfidence = req.confidence;

    const hasDirectResumeProof =
      finalEvidence &&
      finalEvidence.length > 2 &&
      (rawLower.includes(finalEvidence.toLowerCase()) ||
        buildWordBoundaryRegex(req.requirementTitle).test(rawResumeText));

    // RULE 1: NEVER LET GEMINI DOWNGRADE DIRECT EVIDENCE
    // If deterministic engine found exact/alias evidence in raw resume text, deterministic engine wins.
    if (req.status === "MATCHED" && hasDirectResumeProof) {
      finalStatus = "MATCHED";
      finalEvidence = req.evidenceQuote;
      finalConfidence = Math.max(req.confidence, 0.95);

      // If Gemini provided a richer verbatim quote from the text, merge it only if valid
      if (geminiItem?.evidenceQuote && rawLower.includes(geminiItem.evidenceQuote.toLowerCase())) {
        finalEvidence = geminiItem.evidenceQuote;
      }
    } else if (geminiItem) {
      // RULE 2: If deterministic was not exact, but Gemini found verified proof in the raw resume
      if (
        geminiItem.status === "MATCHED" &&
        geminiItem.evidenceQuote &&
        rawLower.includes(geminiItem.evidenceQuote.toLowerCase())
      ) {
        finalStatus = "MATCHED";
        finalEvidence = geminiItem.evidenceQuote;
        finalReasoning = geminiItem.reasoning;
        finalConfidence = geminiItem.confidence || 0.92;
      } else if (
        geminiItem.status === "NOT_FOUND" &&
        req.status !== "MATCHED" // Only accept NOT_FOUND if deterministic didn't find direct proof
      ) {
        finalStatus = "NOT_FOUND";
        finalEvidence = "";
        finalReasoning = geminiItem.reasoning || finalReasoning;
        finalConfidence = geminiItem.confidence || 0.95;
      } else if (geminiItem.status === "PARTIAL") {
        finalStatus = req.status === "MATCHED" ? "MATCHED" : "PARTIAL";
        finalReasoning = geminiItem.reasoning;
      } else if (geminiItem.status === "UNCLEAR") {
        if (req.status !== "MATCHED") {
          finalStatus = "UNCLEAR";
        }
      }
    }

    // RULE 3: IF STATUS = MATCHED, EVIDENCE QUOTE MUST EXIST
    if (finalStatus === "MATCHED") {
      if (!finalEvidence || finalEvidence.trim().length === 0) {
        // Attempt fallback search in raw text
        const regex = buildWordBoundaryRegex(req.requirementTitle);
        if (regex.test(rawResumeText)) {
          finalEvidence = `Verified mention of "${req.requirementTitle}" in candidate resume.`;
        } else {
          // If no evidence can be located anywhere, downgrade to UNCLEAR
          finalStatus = "UNCLEAR";
          finalReasoning = `Requirement marked as matched but verbatim quote could not be confirmed in raw text.`;
          finalConfidence = 0.6;
          humanReviewReasons.push(
            `Requirement "${req.requirementTitle}" requires human verification: evidence quote was missing.`
          );
        }
      }
    }

    // RULE 4: ANTI-CROSS-CONTAMINATION GUARD
    // A skill requirement must never cite solely degree/educational text
    if (req.requirementType === "SKILL" && finalEvidence) {
      const lowerEv = finalEvidence.toLowerCase();
      const lowerTitle = req.requirementTitle.toLowerCase();
      if (
        (lowerEv.includes("bachelor") ||
          lowerEv.includes("degree") ||
          lowerEv.includes("university") ||
          lowerEv.includes("intermediate") ||
          lowerEv.includes("diploma") ||
          lowerEv.includes("polytechnic") ||
          lowerEv.includes("institute") ||
          lowerEv.includes("college") ||
          lowerEv.includes("dae")) &&
        !lowerEv.includes(lowerTitle)
      ) {
        // Discard contaminated quote, replace with clean title mention if in text
        if (buildWordBoundaryRegex(req.requirementTitle).test(rawResumeText)) {
          finalEvidence = `Skill verified in candidate profile: "${req.requirementTitle}"`;
        } else {
          finalEvidence = "";
          finalStatus = "NOT_FOUND";
          finalReasoning = `No evidence found for skill "${req.requirementTitle}".`;
        }
      }
    }

    // Flag human review for critical requirements that are UNCLEAR or PARTIAL
    if (
      (finalStatus === "UNCLEAR" || finalStatus === "PARTIAL") &&
      req.requirementCategory === "REQUIRED"
    ) {
      humanReviewReasons.push(
        `Critical requirement "${req.requirementTitle}" evaluated as ${finalStatus}: ${finalReasoning}`
      );
    }

    totalConfidence += finalConfidence;

    return {
      ...req,
      status: finalStatus,
      evidenceQuote: finalEvidence,
      reasoning: finalReasoning,
      confidence: finalConfidence,
    };
  });

  const count = audited.length || 1;
  const overallConfidence = Math.round((totalConfidence / count) * 100) / 100;
  const humanReviewRecommended = humanReviewReasons.length > 0;

  return {
    requirements: audited,
    humanReviewRecommended,
    humanReviewReasons,
    overallConfidence,
  };
}
