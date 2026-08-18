import { generateStructuredJSON } from "./gemini";
import { z } from "zod";

const JobDescriptionGenerationSchema = z.preprocess(
  (val: any) => {
    if (typeof val === "string") {
      return { description: val };
    }
    if (val && typeof val === "object") {
      return {
        description:
          val.description ||
          val.jobDescription ||
          val.job_description ||
          val.content ||
          val.text ||
          "",
      };
    }
    return val;
  },
  z.object({
    description: z.string().min(20, "Generated description must be substantial"),
  })
);

const JOB_GENERATOR_SYSTEM_PROMPT = `
You are an expert executive recruiter and talent acquisition copywriter.
Your task is to generate a comprehensive, highly engaging, and professional Job Description based on the provided Job Title, Workplace Metadata, and Structured Job Requirements.

STRUCTURE OF THE GENERATED DESCRIPTION:
1. Role Overview (Engaging paragraphs describing the position's mission, team impact, and day-to-day focus).
2. Key Responsibilities (6-8 clear, actionable bullet points describing deliverables, architecture/strategy, and cross-functional collaboration).
3. Required Qualifications (Directly incorporating all REQUIRED skills, experience years, education, and core competencies).
4. Preferred / Bonus Qualifications (Incorporating all PREFERRED and OPTIONAL skills/certifications).
5. Why Join Us / Benefits & Culture (Inspiring summary of growth opportunities, modern engineering/product culture, and perks).

GUIDELINES:
- Format the output with clear headers and bullet points.
- Ensure every single configured requirement provided in the prompt is naturally integrated.
- Tone should be modern, inclusive, and professional.
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
Generate a complete, professional Job Description for the following position:

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

Return a valid JSON object containing the complete formatted job description string in the 'description' field.
`.trim();

  const result = await generateStructuredJSON<{ description: string }>({
    systemPrompt: JOB_GENERATOR_SYSTEM_PROMPT,
    userPrompt,
    schema: JobDescriptionGenerationSchema,
    temperature: 0.3,
  });

  return {
    description: result.data.description,
    telemetry: result.telemetry,
  };
}
