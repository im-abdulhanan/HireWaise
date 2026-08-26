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
        title: z.string().min(1, "Responsibility title is required"),
        description: z.string().min(1, "Responsibility description is required"),
      })
    )
    .min(1),
  requiredQualifications: z
    .array(
      z.object({
        label: z.string().min(1, "Requirement label is required"),
        title: z.string().optional(),
        description: z.string().min(1, "Requirement description is required"),
      })
    )
    .min(1),
  preferredQualifications: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
});

const JOB_GENERATOR_SYSTEM_PROMPT = `
You are an expert executive talent acquisition specialist and recruiter copywriter for HireWise SaaS.
Your task is to generate a clean, modern, recruiter-friendly job description as a structured JSON object.

CRITICAL FORMATTING & HIERARCHY RULES:
1. Two-Level Item Structure (Label + Description):
   - For required qualifications, 'label' MUST be a concise bold title (e.g. "Experience", "Education", "Figma", "Adobe Photoshop", "React", "Node.js").
   - For responsibilities, 'title' MUST be a concise bold area (e.g. "User Interface Design", "User Experience Optimization", "Collaboration and Handoff").
   - 'description' MUST be 1-2 punchy, professional sentences of normal-weight text explaining the role requirement or deliverable.
   - NEVER make the description itself bold, and never combine the label and description into a single giant header.
   - For years of experience, use label "Experience" (e.g. description: "At least 2 years of professional experience working as a UI/UX Designer.").
   - For degrees, use label "Education" (e.g. description: "Must be a graduate with a relevant degree in Design, Computer Science, or a related field.").

2. ABSOLUTELY ZERO RAW MARKDOWN:
   - Return ONLY a valid JSON object matching the requested schema.
   - Do NOT include '###', '##', '#', or '####' markdown heading markers.
   - Do NOT include '*' or '-' bullet characters in strings.
   - Do NOT include '**' bold or '_' italic characters.

3. ACCURACY & EVIDENCE:
   - AI MUST NOT invent phantom requirements or hallucinate skills not mentioned in the configured list.
   - Only elaborate on the provided job requirements and title.
   - Do NOT mention Gemini, AI, LLM, or prompt telemetry in the output.

SCHEMA STRUCTURE:
{
  "overview": "Short compelling 2-3 sentence overview describing the role's mission, team, and impact.",
  "responsibilities": [
    {
      "title": "User Interface Design",
      "description": "Create visually stunning and highly functional user interfaces using industry-standard design tools."
    }
  ],
  "requiredQualifications": [
    {
      "label": "Figma",
      "description": "Advanced proficiency in Figma for creating high-fidelity designs, components, and interactive prototypes."
    },
    {
      "label": "Experience",
      "description": "At least 2 years of professional experience working as a UI/UX Designer."
    },
    {
      "label": "Education",
      "description": "Must be a graduate with a relevant degree in Design, Computer Science, or a related field."
    }
  ],
  "preferredQualifications": [
    "Experience with design systems and accessibility (WCAG) guidelines",
    "Familiarity with front-end handoff and basic HTML/CSS principles"
  ],
  "benefits": [
    "Competitive salary and performance bonuses",
    "Comprehensive medical, dental, and health coverage",
    "Flexible remote or hybrid work schedule",
    "Annual learning budget and professional development stipend"
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

Generate the structured JSON response now. Remember:
- Label/Title = bold category/skill name ONLY (e.g. "Experience", "Education", "Figma")
- Description = normal-weight explanation sentences
- Absolutely NO raw Markdown (#, ##, ###, ####, **, * bullets).
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
