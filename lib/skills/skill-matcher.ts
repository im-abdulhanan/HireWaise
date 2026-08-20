/**
 * Context-Aware Skill Matcher Engine
 * 
 * Performs multi-layer matching combining:
 * 1. ESCO & Custom Alias Normalization
 * 2. Parent/Child Skill Hierarchy Evaluation
 * 3. Contextual Action & Responsibility Verification from Resume Text/Experience
 * 4. Verifiable Evidence Extraction
 */

import { CandidateResumeExtraction } from "@/lib/ai/schemas";
import { normalizeRequirement, buildWordBoundaryRegex, cleanKey } from "@/lib/ai/requirement-normalizer";
import {
  APPLICATION_SKILL_ALIASES,
  cleanAlphanumeric,
  resolveApplicationAlias,
} from "./skill-aliases";
import { normalizeSkillTerm } from "./esco-normalizer";
import { ContextMatchResult } from "./types";

/**
 * Searches the candidate's resume text and experiences to verify contextual actions
 * for specialized requirements (e.g., verifying "Linux Administration" when candidate text contains "Administered Ubuntu servers...").
 */
export function verifyContextualActions(
  rawResumeText: string,
  structuredResume: CandidateResumeExtraction | undefined,
  requirementTitle: string
): {
  hasEvidence: boolean;
  evidenceQuote: string;
  reasoning: string;
  confidence: number;
} {
  const reqDef = resolveApplicationAlias(requirementTitle);
  if (!reqDef || !reqDef.actionKeywords || reqDef.actionKeywords.length === 0) {
    return { hasEvidence: false, evidenceQuote: "", reasoning: "", confidence: 0 };
  }

  const actionKeywords = reqDef.actionKeywords;
  const entities = reqDef.associatedEntities || [reqDef.displayName.toLowerCase()];

  // 1. Check structured experiences
  const experiences = structuredResume?.experience || [];
  for (const exp of experiences) {
    const textToCheck = `${exp.jobTitle || ""} ${exp.description || ""} ${(exp.skillsUsed || []).join(" ")}`.toLowerCase();

    const matchedAction = actionKeywords.find((act) => textToCheck.includes(act));
    const matchedEntity = entities.find((ent) => textToCheck.includes(ent));

    if (matchedAction && matchedEntity) {
      const quote = exp.description
        ? `${exp.jobTitle} at ${exp.company}: "${exp.description.slice(0, 140)}..."`
        : `${exp.jobTitle} at ${exp.company} (verified ${matchedAction} ${matchedEntity})`;

      return {
        hasEvidence: true,
        evidenceQuote: quote,
        reasoning: `Candidate's work history as ${exp.jobTitle} at ${exp.company} demonstrates hands-on ${reqDef.displayName} (${matchedAction} ${matchedEntity}).`,
        confidence: 96,
      };
    }
  }

  // 2. Check raw text sentences
  if (rawResumeText) {
    const sentences = rawResumeText.split(/\r?\n|(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      const matchedAction = actionKeywords.find((act) => lower.includes(act));
      const matchedEntity = entities.find((ent) => lower.includes(ent));

      if (matchedAction && matchedEntity) {
        const cleaned = sentence.trim().replace(/^[\s•*\-–—|>]+/, "");
        return {
          hasEvidence: true,
          evidenceQuote: cleaned.length > 160 ? cleaned.slice(0, 160) + "..." : cleaned,
          reasoning: `Resume text demonstrates verified ${reqDef.displayName} responsibilities (${matchedAction} ${matchedEntity}).`,
          confidence: 95,
        };
      }
    }
  }

  return { hasEvidence: false, evidenceQuote: "", reasoning: "", confidence: 0 };
}

/**
 * Evaluates a single skill requirement against candidate extracted profile & raw text.
 */
export async function evaluateSkillRequirement(params: {
  requirementTitle: string;
  requirementType?: string;
  rawResumeText: string;
  candidate?: CandidateResumeExtraction;
}): Promise<ContextMatchResult> {
  const { requirementTitle, requirementType = "SKILL", rawResumeText, candidate } = params;
  const normReq = await normalizeSkillTerm(requirementTitle);
  const canonicalReqKey = normReq.canonicalKey;

  const baseResult: ContextMatchResult = {
    status: "NOT_FOUND",
    matchMethod: "NONE",
    confidence: 95,
    evidenceQuote: null,
    reasoning: `No evidence found for requirement "${requirementTitle}" in candidate resume.`,
    normalizedRequirement: canonicalReqKey,
    escoConceptUri: normReq.escoConceptUri,
    escoPreferredLabel: normReq.escoPreferredLabel,
  };

  if (!rawResumeText && !candidate) {
    return baseResult;
  }

  // 1. Contextual Action & Responsibility Verification (e.g. Linux Administration verified from server management context)
  const actionCheck = verifyContextualActions(rawResumeText, candidate, requirementTitle);
  if (actionCheck.hasEvidence) {
    return {
      ...baseResult,
      status: "MATCHED",
      matchMethod: "EVIDENCE_VERIFIED",
      confidence: actionCheck.confidence,
      evidenceQuote: actionCheck.evidenceQuote,
      reasoning: actionCheck.reasoning,
      matchedCandidateSkill: normReq.normalizedTerm,
    };
  }

  // 2. Direct verbatim textual match in raw resume
  const exactRegex = buildWordBoundaryRegex(requirementTitle);
  if (exactRegex.test(rawResumeText)) {
    const lines = rawResumeText.split(/\r?\n/).map((l) => l.trim());
    const matchedLine = lines.find((l) => exactRegex.test(l) || l.toLowerCase().includes(requirementTitle.toLowerCase()));
    const quote = matchedLine ? matchedLine.replace(/^[•*\-–—|>\s]+/, "").trim() : requirementTitle;

    return {
      ...baseResult,
      status: "MATCHED",
      matchMethod: "EXACT",
      confidence: 98,
      evidenceQuote: quote,
      reasoning: `Direct verbatim textual match for "${requirementTitle}" found in candidate resume.`,
      matchedCandidateSkill: requirementTitle,
    };
  }

  // 3. Alias match in raw resume text or candidate skills
  const customDef = resolveApplicationAlias(requirementTitle);
  if (customDef) {
    for (const alias of customDef.aliases) {
      if (alias.length >= 2) {
        const aliasRegex = buildWordBoundaryRegex(alias);
        if (aliasRegex.test(rawResumeText)) {
          const lines = rawResumeText.split(/\r?\n/).map((l) => l.trim());
          const matchedLine = lines.find((l) => aliasRegex.test(l) || l.toLowerCase().includes(alias.toLowerCase()));
          const quote = matchedLine ? matchedLine.replace(/^[•*\-–—|>\s]+/, "").trim() : alias;

          return {
            ...baseResult,
            status: "MATCHED",
            matchMethod: "ALIAS",
            confidence: 95,
            evidenceQuote: quote,
            reasoning: `Direct textual match for alias "${alias}" (${customDef.displayName}) found in candidate resume.`,
            matchedCandidateSkill: alias,
          };
        }
      }
    }
  }

  // 4. Candidate structured skills list check
  const candidateSkills = [
    ...(candidate?.skills || []),
    ...(candidate?.normalizedSkills || []),
  ];

  for (const candSkill of candidateSkills) {
    const normCand = await normalizeSkillTerm(candSkill);

    // Direct canonical key match (e.g. ReactJS -> React.js both canonical "react")
    if (normCand.canonicalKey === canonicalReqKey && canonicalReqKey.length > 0) {
      return {
        ...baseResult,
        status: "MATCHED",
        matchMethod: "ALIAS",
        confidence: 95,
        evidenceQuote: `Skill verified in candidate profile: "${candSkill}"`,
        reasoning: `Candidate profile lists skill "${candSkill}", normalizing to canonical "${normReq.normalizedTerm}".`,
        matchedCandidateSkill: candSkill,
      };
    }

    // Hierarchical Check:
    // Case A: Candidate has specialized Child skill (e.g. Ubuntu for Linux) => Full Match
    if (normCand.broaderSkills?.includes(canonicalReqKey) || customDef?.children?.includes(normCand.canonicalKey)) {
      return {
        ...baseResult,
        status: "MATCHED",
        matchMethod: "HIERARCHICAL",
        confidence: 92,
        evidenceQuote: `Skill verified in candidate profile: "${candSkill}"`,
        reasoning: `Candidate profile lists specialized skill "${candSkill}", satisfying general requirement "${requirementTitle}".`,
        matchedCandidateSkill: candSkill,
      };
    }

    // Case B: Candidate ONLY lists general Parent skill (e.g. Linux for Linux Administration) => PARTIAL
    if (normReq.broaderSkills?.includes(normCand.canonicalKey) || customDef?.parents?.includes(normCand.canonicalKey)) {
      return {
        ...baseResult,
        status: "PARTIAL",
        matchMethod: "HIERARCHICAL",
        confidence: 75,
        evidenceQuote: candSkill,
        reasoning: `Candidate lists ${candSkill} as a skill, but the resume does not provide sufficient evidence of ${requirementTitle} responsibilities.`,
        matchedCandidateSkill: candSkill,
      };
    }
  }

  return baseResult;
}
