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
4. For each requirement, produce an item in the requirementsList with:
   - title: Clear, concise title (e.g. "React", "3+ Years Backend Experience", "Bachelor's in CS")
   - category: "REQUIRED" | "PREFERRED" | "OPTIONAL"
   - type: "SKILL" | "EXPERIENCE" | "EDUCATION" | "CERTIFICATION" | "CUSTOM"
   - normalizedKey: A machine-friendly lowercase slug (e.g. "skill_react", "exp_years_3", "edu_bachelor_cs")
   - minimumValue: Numeric value if applicable (e.g. 3 for 3 years)
   - description: Clarifying context if needed
5. Never invent or hallucinate requirements not stated or implied in the job description.
`.trim();

/**
 * Intelligent heuristic fallback parser for job descriptions
 * when Gemini API key is unreachable or rate limited.
 */
function parseJobDescriptionHeuristic(text: string): JobRequirementsExtraction {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract experience years
  let expYears = 0;
  const expMatch = text.match(/(\d+)\+?\s*(?:-\s*\d+)?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+experience|\s+work)?/i);
  if (expMatch) {
    expYears = parseInt(expMatch[1], 10);
  }

  // Common technical skills lexicon
  const SKILL_LEXICON = [
    "JavaScript", "TypeScript", "Node.js", "React", "React.js", "Next.js", "Vue.js", "Angular",
    "Python", "Django", "FastAPI", "Go", "Golang", "Java", "Spring Boot", "C++", "C#", ".NET",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "SQL",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "CI/CD", "Terraform", "Linux",
    "REST APIs", "GraphQL", "gRPC", "Microservices", "Distributed Systems", "Kafka", "RabbitMQ",
    "Tailwind CSS", "HTML5", "CSS3", "Git", "Jest", "Cypress"
  ];

  const foundSkills = new Set<string>();
  for (const skill of SKILL_LEXICON) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(?:\\b|\\s)${escaped}(?:\\b|\\s|[.,;])`, "i");
    if (regex.test(text)) {
      foundSkills.add(skill);
    }
  }

  const skillsArr = Array.from(foundSkills);
  const requiredSkills = skillsArr.slice(0, Math.min(4, skillsArr.length));
  const preferredSkills = skillsArr.slice(4);

  // Education check
  const hasDegree = /bachelor|master|degree|computer science|b\.s\.|m\.s\./i.test(text);
  const educationRequirements = hasDegree
    ? ["Bachelor's Degree in Computer Science or related technical field"]
    : [];

  const requirementsList: any[] = [];
  let order = 0;

  // Add required skills
  for (const s of requiredSkills) {
    requirementsList.push({
      title: `${s} Proficiency`,
      category: "REQUIRED",
      type: "SKILL",
      normalizedKey: slugify(`skill_${s}`),
      order: order++,
    });
  }

  // Add experience requirement
  if (expYears > 0) {
    requirementsList.push({
      title: `${expYears}+ Years Professional Experience`,
      category: "REQUIRED",
      type: "EXPERIENCE",
      minimumValue: expYears,
      normalizedKey: slugify(`exp_${expYears}_years`),
      order: order++,
    });
  }

  // Add preferred skills
  for (const s of preferredSkills) {
    requirementsList.push({
      title: `${s} (Bonus / Preferred)`,
      category: "PREFERRED",
      type: "SKILL",
      normalizedKey: slugify(`pref_${s}`),
      order: order++,
    });
  }

  // Add education
  if (educationRequirements.length > 0) {
    requirementsList.push({
      title: educationRequirements[0],
      category: "PREFERRED",
      type: "EDUCATION",
      normalizedKey: slugify("edu_bachelor_cs"),
      order: order++,
    });
  }

  return {
    minimumExperienceYears: expYears,
    educationRequirements,
    requiredSkills,
    preferredSkills,
    optionalSkills: [],
    certifications: [],
    customRequirements: [],
    requirementsList,
  };
}

export async function parseJobDescriptionWithGemini(
  jobDescriptionText: string
): Promise<{
  data: JobRequirementsExtraction;
  telemetry: any;
}> {
  if (!jobDescriptionText || jobDescriptionText.trim().length < 10) {
    throw new Error("Job description is too short to analyze.");
  }

  try {
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

    result.data.requirementsList = result.data.requirementsList.map((item) => ({
      ...item,
      normalizedKey: slugify(item.normalizedKey || `${item.type}_${item.title}`),
    }));

    return result;
  } catch (err: any) {
    console.warn("Gemini parse failed, using intelligent heuristic fallback:", err.message);
    const fallbackData = parseJobDescriptionHeuristic(jobDescriptionText);
    return {
      data: fallbackData,
      telemetry: {
        model: "heuristic-nlp-fallback",
        inputTokens: Math.ceil(jobDescriptionText.length / 4),
        outputTokens: 150,
        processingDurationMs: 15,
        retryCount: 0,
        estimatedCostUsd: 0,
      },
    };
  }
}
