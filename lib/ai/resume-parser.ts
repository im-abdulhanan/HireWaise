import { generateStructuredJSON } from "./gemini";
import {
  CandidateResumeExtraction,
  CandidateResumeExtractionSchema,
} from "./schemas";
import { wrapUntrustedDocument } from "@/lib/security/prompt-defense";
import { slugify } from "@/lib/utils";

const RESUME_PARSER_SYSTEM_PROMPT = `
You are an expert, objective Resume Information Extractor.
Your task is to parse raw text from an uploaded candidate resume and convert it into a structured candidate profile.

CRITICAL RESPONSIBLE AI & ETHICS RULES:
1. Extract ONLY objective, employment-related qualifications (skills, experience, education, projects, certifications).
2. NEVER infer, extract, or score based on protected or sensitive characteristics:
   - Race, ethnicity, nationality, religion, political views
   - Gender, sexual orientation, marital/parental status
   - Physical appearance, disability, or estimated age
3. If an item (e.g. phone, summary, dates) is not found in the resume, use an empty string or empty array.
4. DO NOT hallucinate or fabricate facts not supported by the resume text.

PARSING GUIDELINES:
- candidateName: Full name of candidate.
- email: Primary email address.
- skills: Array of specific technical, programming, tool, and domain skills.
- normalizedSkills: Lowercase, canonical versions of skills (e.g. "React" -> "react", "Node.js" -> "node.js").
- experience: Chronological work history with jobTitle, company, start/end dates, description, skillsUsed, and approximate durationYears.
- totalExperienceYears: Total combined professional experience in years (calculated from work history).
- education: Array of education entries with:
  * institution: College or university name.
  * degree: Degree name (e.g. "Bachelor of Science", "BS Computer Science", "MS Software Engineering").
  * fieldOfStudy: Major or subject area.
  * graduationYear: Graduation year if specified.
  * startDate / endDate: Date strings if available.
  * isCurrent: boolean (true if currently enrolled/studying).
  * isCompleted: boolean (true ONLY if explicitly graduated or completed; false if currently enrolled or dropped out; do not assume true if no date/status is given).
  * academicStatus: "GRADUATED" | "FINAL_YEAR" | "ENROLLED" | "DROPPED_OUT" | "UNCLEAR".
    - "GRADUATED": Explicitly states graduated, completed, or degree completed in past year.
    - "FINAL_YEAR": Explicitly states final year, 4th year (of 4-year degree), senior year, or expected graduation within 12 months.
    - "ENROLLED": States 1st year, 2nd year, 3rd year, freshman, sophomore, junior, or currently studying without completion.
    - "UNCLEAR": Degree is mentioned with no dates, no year level, and no completion status.
  * academicYearLevel: Exact year level if stated (e.g. "Final Year", "4th Year", "3rd Year", "2nd Year", "1st Year", "Graduated").
- highestDegree: Highest level achieved (e.g. "Bachelor's", "Master's", "PhD", "Associate", "High School").
`.trim();

export async function parseResumeWithGemini(
  resumeRawText: string
): Promise<{
  data: CandidateResumeExtraction;
  telemetry: any;
}> {
  if (!resumeRawText || resumeRawText.trim().length < 20) {
    throw new Error("Resume text is empty or too short to extract candidate data.");
  }

  const wrappedDoc = wrapUntrustedDocument("RESUME_DOCUMENT", resumeRawText);

  const userPrompt = `
Extract structured candidate employment data from the following resume document:

${wrappedDoc}

Ensure all dates, skills, experiences, and education entries are accurately represented.
`.trim();

  const result = await generateStructuredJSON<CandidateResumeExtraction>({
    systemPrompt: RESUME_PARSER_SYSTEM_PROMPT,
    userPrompt,
    schema: CandidateResumeExtractionSchema,
    temperature: 0.1,
  });

  // Post-process normalized skills
  const normalized = Array.from(
    new Set(
      result.data.skills.map((s) => s.toLowerCase().trim()).filter(Boolean)
    )
  );

  result.data.normalizedSkills = normalized;

  // Calculate total experience years if not provided or 0
  if (result.data.totalExperienceYears === 0 && result.data.experience.length > 0) {
    const sumYears = result.data.experience.reduce(
      (acc, exp) => acc + (exp.durationYears || 0),
      0
    );
    result.data.totalExperienceYears = Number(sumYears.toFixed(1));
  }

  return result;
}
