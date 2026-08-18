import { generateStructuredJSON } from "./gemini";
import {
  JobRequirementsExtraction,
  JobRequirementsExtractionSchema,
} from "./schemas";
import { wrapUntrustedDocument } from "@/lib/security/prompt-defense";
import { slugify } from "@/lib/utils";

const JOB_PARSER_SYSTEM_PROMPT = `
You are an expert HR Requirements Analyst.
Your task is to analyze a raw Job Description and extract structured, objective job qualifications.

RULES:
1. Distinguish strictly between:
   - REQUIRED: Must-have qualifications without which a candidate cannot do the job.
   - PREFERRED: Nice-to-have or bonus qualifications.
   - OPTIONAL: Beneficial extras or edge capabilities.
2. Extract the minimum required years of experience (numeric value, 0 if not specified).
3. Extract required degree levels and relevant fields of study (e.g. Bachelor's in Computer Science).
4. Academic Status Requirements:
   - Criteria regarding current student/graduation status (e.g. "Final year or Graduate", "Final year students only", "Fresh graduates", "Currently enrolled") MUST have type: "ACADEMIC_STATUS" (do NOT classify these as generic degree EDUCATION).
5. For each requirement, produce an item in the requirementsList with:
   - title: Clear, concise title (e.g. "React", "3+ Years Backend Experience", "Bachelor's in CS", "Final year or Graduate")
   - category: "REQUIRED" | "PREFERRED" | "OPTIONAL"
   - type: "SKILL" | "EXPERIENCE" | "EDUCATION" | "ACADEMIC_STATUS" | "CERTIFICATION" | "CUSTOM"
   - normalizedKey: A machine-friendly lowercase slug (e.g. "skill_react", "exp_years_3", "edu_bachelor_cs", "academic_status_final_year_or_graduate")
   - minimumValue: Numeric value if applicable (e.g. 3 for 3 years)
   - description: Clarifying context if needed
6. Never invent or hallucinate requirements not stated or implied in the job description.
`.trim();

export async function parseJobDescriptionWithGemini(
  jobDescriptionText: string
): Promise<{
  data: JobRequirementsExtraction;
  telemetry: any;
}> {
  if (!jobDescriptionText || jobDescriptionText.trim().length < 10) {
    throw new Error("Job description is too short to analyze.");
  }

  const wrappedDoc = wrapUntrustedDocument(
    "JOB_DESCRIPTION",
    jobDescriptionText
  );

  const userPrompt = `
Analyze the following job description and extract structured requirements:

${wrappedDoc}

Extract all required skills, preferred skills, minimum experience years, education, certifications, and complete requirementsList.
`.trim();

  const result = await generateStructuredJSON<JobRequirementsExtraction>({
    systemPrompt: JOB_PARSER_SYSTEM_PROMPT,
    userPrompt,
    schema: JobRequirementsExtractionSchema,
    temperature: 0.1,
  });

  // Ensure normalized keys are cleanly formatted
  result.data.requirementsList = result.data.requirementsList.map((item) => ({
    ...item,
    normalizedKey: slugify(item.normalizedKey || `${item.type}_${item.title}`),
  }));

  return result;
}
