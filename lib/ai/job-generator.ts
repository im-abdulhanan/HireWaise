import { generateStructuredJSON } from "./gemini";
import { z } from "zod";
import {
  parseJobDescription,
  StructuredJobDescription,
  formatStructuredDescriptionAsText,
} from "@/lib/jobs/description-parser";

const JobDescriptionGenerationSchema = z.object({
  overview: z.string().min(10, "Overview is required"),
  responsibilities: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .min(1),
  requiredQualifications: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .min(1),
  preferredQualifications: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
});

const JOB_GENERATOR_SYSTEM_PROMPT = `
You are an expert executive talent acquisition specialist and recruiter copywriter.
Your task is to generate a clean, modern, recruiter-friendly job description as a structured JSON object.

CRITICAL REQUIREMENTS:
- Return ONLY a valid JSON object matching the requested schema.
- NEVER use raw Markdown formatting anywhere in your text.
- Do NOT include '###', '##', '#', or markdown heading markers.
- Do NOT include '*' or '-' bullet characters in strings.
- Do NOT include '**' bold or '_' italic characters.
- Keep sentences concise, direct, and professional.
- AI MUST NOT invent phantom requirements or hallucinate skills not mentioned in the configured list. Only elaborate on the provided job requirements and title.
- Do NOT mention Gemini, AI, LLM, or prompt telemetry in the description.

SCHEMA STRUCTURE:
{
  "overview": "Short, compelling 2-3 sentence overview describing the role's mission and team impact.",
  "responsibilities": [
    {
      "title": "Short Clean Responsibility Area",
      "description": "1-2 punchy sentences explaining specific duties and deliverables."
    }
  ],
  "requiredQualifications": [
    {
      "title": "Requirement or Skill Name (e.g. Node.js / Education / Years of Experience)",
      "description": "Specific qualification requirements directly derived from the configured requirements."
    }
  ],
  "preferredQualifications": [
    "Clean string for preferred skill 1 without bullets or markdown",
    "Clean string for preferred skill 2"
  ],
  "benefits": [
    "Competitive compensation and performance bonuses",
    "Comprehensive medical, dental, and vision health coverage",
    "Flexible remote/hybrid work environment",
    "Professional development stipend and learning budget"
  ]
}
`.trim();

export interface GenerateDescriptionParams {
  jobTitle: string;
  department?: string;
  location?: string;
  workplaceType?: string;
  employmentType?: string;
  requirements: Array<{
    title: string;
    category?: "REQUIRED" | "PREFERRED" | "OPTIONAL" | string;
    type?: string;
    minimumValue?: number;
    description?: string;
  }>;
}

export async function generateJobDescriptionWithGemini(
  params: GenerateDescriptionParams
): Promise<{
  structuredDescription: StructuredJobDescription;
  description: string;
  telemetry: any;
}> {
  const {
    jobTitle,
    department = "General",
    location = "Remote",
    workplaceType = "REMOTE",
    employmentType = "FULL_TIME",
    requirements = [],
  } = params;

  if (!jobTitle || jobTitle.trim().length < 2) {
    throw new Error("Job title is required to generate a description.");
  }

  const requiredReqs = requirements.filter(
    (r) => r.category === "REQUIRED" || !r.category
  );
  const preferredReqs = requirements.filter(
    (r) => r.category === "PREFERRED" || r.category === "OPTIONAL"
  );

  const userPrompt = `
Generate a clean, professional, structured Job Description for:

JOB TITLE: ${jobTitle}
DEPARTMENT: ${department}
LOCATION: ${location}
WORKPLACE TYPE: ${workplaceType}
EMPLOYMENT TYPE: ${employmentType}

CONFIGURED MUST-HAVE REQUIREMENTS (${requiredReqs.length}):
${
  requiredReqs.length > 0
    ? requiredReqs
        .map(
          (r, i) =>
            `${i + 1}. [${r.type || "SKILL"}] ${r.title}${
              r.minimumValue ? ` (${r.minimumValue}+ years)` : ""
            }${r.description ? ` - ${r.description}` : ""}`
        )
        .join("\n")
    : "Standard industry requirements for this title."
}

CONFIGURED PREFERRED / BONUS QUALIFICATIONS (${preferredReqs.length}):
${
  preferredReqs.length > 0
    ? preferredReqs
        .map(
          (r, i) =>
            `${i + 1}. [${r.type || "SKILL"}] ${r.title}${
              r.minimumValue ? ` (${r.minimumValue}+ years)` : ""
            }${r.description ? ` - ${r.description}` : ""}`
        )
        .join("\n")
    : "Bonus skills relevant to the role."
}

Generate the structured JSON response now. Remember: absolutely NO Markdown characters (no ###, no **, no * bullets).
`.trim();

  const result = await generateStructuredJSON<StructuredJobDescription>({
    systemPrompt: JOB_GENERATOR_SYSTEM_PROMPT,
    userPrompt,
    schema: JobDescriptionGenerationSchema,
    temperature: 0.3,
  });

  // Guarantee clean normalization
  const normalized = parseJobDescription(result.data);
  const formattedText = formatStructuredDescriptionAsText(normalized);

  return {
    structuredDescription: normalized,
    description: formattedText,
    telemetry: result.telemetry,
  };
}
