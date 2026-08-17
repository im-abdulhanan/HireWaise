import { generateStructuredJSON } from "./gemini";
import {
  EvidenceVerificationReport,
  EvidenceVerificationReportSchema,
  CandidateResumeExtraction,
} from "./schemas";
import { wrapUntrustedDocument } from "@/lib/security/prompt-defense";
import { EvaluatedRequirement } from "./matcher";

const VERIFIER_SYSTEM_PROMPT = `
You are an expert, objective AI Evidence Verification Auditor for recruitment screening.
Your task is to audit requirement matches against the candidate's original resume text.

ANTI-HALLUCINATION & EVIDENCE RULES:
1. Every MATCHED or PARTIAL requirement MUST be supported by explicit textual evidence in the resume.
2. If a requirement claim cannot be found or is ambiguous in the resume, mark its status as "UNCLEAR" or "NOT_FOUND" and lower confidence.
3. Extract the exact or near-exact quote from the resume as 'evidenceQuote' whenever possible.
4. For each requirement, produce:
   - requirementTitle: The requirement title
   - status: "MATCHED" | "PARTIAL" | "NOT_FOUND" | "UNCLEAR"
   - evidenceQuote: Verbatim quote from resume supporting the status (empty string if NOT_FOUND)
   - reasoning: Clear 1-2 sentence explanation of why this status was determined
   - confidence: Number between 0.0 and 1.0 representing confidence in this finding
5. In the top-level report:
   - humanReviewRecommended: true if any critical requirement is UNCLEAR or PARTIAL, or if evidence is ambiguous
   - humanReviewReasons: array of specific issues requiring human recruiter attention
   - summary: concise summary of the evidence verification audit.
`.trim();

export async function verifyEvidenceWithGemini(params: {
  resumeRawText: string;
  candidateData: CandidateResumeExtraction;
  evaluatedRequirements: EvaluatedRequirement[];
}): Promise<{
  data: EvidenceVerificationReport;
  telemetry: any;
}> {
  const { resumeRawText, candidateData, evaluatedRequirements } = params;

  const wrappedDoc = wrapUntrustedDocument("RESUME_DOCUMENT", resumeRawText);

  const requirementsSummary = evaluatedRequirements.map((r) => ({
    title: r.requirementTitle,
    category: r.requirementCategory,
    type: r.requirementType,
    initialStatus: r.status,
    initialReasoning: r.reasoning,
  }));

  const userPrompt = `
Verify the following requirements against the candidate's actual resume text.

CANDIDATE PROFILE SUMMARY:
Name: ${candidateData.candidateName}
Total Experience: ${candidateData.totalExperienceYears} years
Extracted Skills: ${candidateData.skills.join(", ")}

REQUIREMENTS TO AUDIT:
${JSON.stringify(requirementsSummary, null, 2)}

ORIGINAL RESUME SOURCE TEXT:
${wrappedDoc}

Audit each requirement and return the verified status, evidence quote, confidence, and human review recommendations.
`.trim();

  const result = await generateStructuredJSON<EvidenceVerificationReport>({
    systemPrompt: VERIFIER_SYSTEM_PROMPT,
    userPrompt,
    schema: EvidenceVerificationReportSchema,
    temperature: 0.1,
  });

  return result;
}
