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

STRICT AUDIT & PER-REQUIREMENT ISOLATION RULES:
1. Process and audit each requirement INDEPENDENTLY. Maintain the exact 'requirementId' from the input for every verified item.
2. NEVER reuse or copy an evidence quote from one requirement to another.
3. TYPE-SPECIFIC EVIDENCE CONSTRAINTS:
   - SKILL Requirements (e.g. "React.js", "AI API integration", "Data Pipeline", "Node.js"):
     * The evidenceQuote MUST contain explicit textual proof of that specific technical skill, programming language, framework, API, or project usage.
     * NEVER cite university degrees, graduation dates, or unrelated educational information for a SKILL requirement.
     * If the skill is not explicitly mentioned in the resume, set status: "NOT_FOUND" and evidenceQuote: "".
   - EXPERIENCE Requirements (e.g. "4+ years software engineering experience"):
     * The evidenceQuote MUST cite work history, job roles, or total duration of employment.
   - EDUCATION Requirements (e.g. "Bachelor's Degree in Computer Science"):
     * The evidenceQuote MUST cite the degree level, major/field of study, or academic institution.
   - ACADEMIC_STATUS Requirements (e.g. "Final year or Graduate", "Graduate", "Currently enrolled"):
     * The evidenceQuote MUST cite explicit proof of current student level (e.g. "Final Year", "4th Year", "Senior") OR explicit graduation completion (e.g. "Graduated 2024", "Completed degree").
     * CRITICAL: An "Intermediate" or high school certificate completed in 2024 is NOT a Bachelor's Graduate.
     * CRITICAL: A candidate currently enrolled in a Bachelor's program with no graduation proof is NOT a Graduate.

4. For each requirement, produce:
   - requirementId: Exact string ID provided in the input for this requirement
   - requirementTitle: The requirement title
   - requirementType: Exact requirementType from input ("SKILL", "EXPERIENCE", "EDUCATION", "ACADEMIC_STATUS", "CERTIFICATION", "CUSTOM")
   - requirementCategory: Exact requirementCategory from input ("REQUIRED", "PREFERRED", "OPTIONAL")
   - status: "MATCHED" | "PARTIAL" | "NOT_FOUND" | "UNCLEAR"
   - evidenceQuote: Verbatim quote from resume supporting the finding (MUST be empty string if NOT_FOUND or if no relevant quote exists)
   - reasoning: Clear 1-2 sentence explanation specific to THIS requirement only
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
    requirementId: r.jobRequirementId,
    requirementTitle: r.requirementTitle,
    requirementType: r.requirementType,
    requirementCategory: r.requirementCategory,
    initialStatus: r.status,
    initialReasoning: r.reasoning,
  }));

  const userPrompt = `
Verify the following requirements against the candidate's actual resume text.
Audit each requirement independently and attach evidence quotes ONLY from relevant resume sections.

CANDIDATE PROFILE SUMMARY:
Name: ${candidateData.candidateName}
Total Experience: ${candidateData.totalExperienceYears} years
Extracted Skills: ${candidateData.skills.join(", ")}
Education: ${JSON.stringify(candidateData.education || [])}

REQUIREMENTS TO AUDIT (MATCH EXACT REQUIREMENT IDs):
${JSON.stringify(requirementsSummary, null, 2)}

ORIGINAL RESUME SOURCE TEXT:
${wrappedDoc}

Audit each requirement and return the verified status, evidence quote, confidence, and human review recommendations with exact requirementId matching.
`.trim();

  const result = await generateStructuredJSON<EvidenceVerificationReport>({
    systemPrompt: VERIFIER_SYSTEM_PROMPT,
    userPrompt,
    schema: EvidenceVerificationReportSchema,
    temperature: 0.1,
  });

  return result;
}

export default verifyEvidenceWithGemini;
