import { z } from "zod";

/**
 * Structured Job Description Schema
 * Canonical interface for recruiter-friendly, clean job descriptions without raw Markdown.
 */
export interface ResponsibilityItem {
  title: string;
  description: string;
}

export interface QualificationItem {
  title: string;
  description: string;
}

export interface StructuredJobDescription {
  overview: string;
  responsibilities: ResponsibilityItem[];
  requiredQualifications: QualificationItem[];
  preferredQualifications: string[];
  benefits: string[];
}

export const StructuredJobDescriptionSchema = z.object({
  overview: z.string().default(""),
  responsibilities: z
    .array(
      z.object({
        title: z.string().default(""),
        description: z.string().default(""),
      })
    )
    .default([]),
  requiredQualifications: z
    .array(
      z.object({
        title: z.string().default(""),
        description: z.string().default(""),
      })
    )
    .default([]),
  preferredQualifications: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
});

/**
 * Strips all Markdown syntax characters (###, ##, #, **, *, -, `) from a string.
 */
export function stripMarkdown(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/^#{1,6}\s+/gm, "") // remove leading #, ##, ### headers
    .replace(/\*\*(.*?)\*\*/g, "$1") // remove **bold**
    .replace(/__(.*?)__/g, "$1") // remove __bold__
    .replace(/\*(.*?)\*/g, "$1") // remove *italic*
    .replace(/_(.*?)_/g, "$1") // remove _italic_
    .replace(/^[\s]*[-*+]\s+/gm, "") // remove list bullets -, *, +
    .replace(/^[\s]*\d+\.\s+/gm, "") // remove numbered lists 1. , 2.
    .replace(/`([^`]+)`/g, "$1") // remove inline code `code`
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .trim();
}

/**
 * Parses and normalizes any input (structured JSON object, JSON string, or legacy Markdown string)
 * into a guaranteed, clean StructuredJobDescription object with zero Markdown characters.
 */
export function parseJobDescription(raw: any): StructuredJobDescription {
  const emptyDefault: StructuredJobDescription = {
    overview: "",
    responsibilities: [],
    requiredQualifications: [],
    preferredQualifications: [],
    benefits: [],
  };

  if (!raw) return emptyDefault;

  // 1. If already a valid structured object
  if (typeof raw === "object" && !Array.isArray(raw)) {
    if (
      raw.overview !== undefined ||
      raw.responsibilities !== undefined ||
      raw.requiredQualifications !== undefined
    ) {
      return {
        overview: stripMarkdown(String(raw.overview || "")),
        responsibilities: (Array.isArray(raw.responsibilities) ? raw.responsibilities : []).map(
          (item: any) =>
            typeof item === "string"
              ? splitTitleDescription(stripMarkdown(item))
              : {
                  title: stripMarkdown(String(item.title || "")),
                  description: stripMarkdown(String(item.description || "")),
                }
        ),
        requiredQualifications: (Array.isArray(raw.requiredQualifications)
          ? raw.requiredQualifications
          : []
        ).map((item: any) =>
          typeof item === "string"
            ? splitTitleDescription(stripMarkdown(item))
            : {
                title: stripMarkdown(String(item.title || "")),
                description: stripMarkdown(String(item.description || "")),
              }
        ),
        preferredQualifications: (Array.isArray(raw.preferredQualifications)
          ? raw.preferredQualifications
          : []
        )
          .map((item: any) => stripMarkdown(typeof item === "string" ? item : item.title || item.description || ""))
          .filter(Boolean),
        benefits: (Array.isArray(raw.benefits) ? raw.benefits : [])
          .map((item: any) => stripMarkdown(typeof item === "string" ? item : item.title || item.description || ""))
          .filter(Boolean),
      };
    }
  }

  // 2. If it's a string, check if it's stringified JSON
  if (typeof raw === "string") {
    const trimmed = raw.trim();

    // Check for JSON object in string (or wrapped in ```json ... ```)
    let jsonString = trimmed;
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
    }

    if (jsonString.startsWith("{") && jsonString.endsWith("}")) {
      try {
        const parsed = JSON.parse(jsonString);
        return parseJobDescription(parsed);
      } catch {
        // Not valid JSON, fall through to Markdown/Text parsing
      }
    }

    // 3. Parse legacy Markdown / Plain Text into Structured Sections
    return parseLegacyMarkdownToStructured(trimmed);
  }

  return emptyDefault;
}

/**
 * Splits a text line into title and description if separated by colon or dash.
 */
function splitTitleDescription(text: string): { title: string; description: string } {
  const clean = stripMarkdown(text);
  const colonIndex = clean.indexOf(":");
  if (colonIndex > 0 && colonIndex < 60) {
    return {
      title: clean.substring(0, colonIndex).trim(),
      description: clean.substring(colonIndex + 1).trim(),
    };
  }
  const dashIndex = clean.indexOf(" - ");
  if (dashIndex > 0 && dashIndex < 60) {
    return {
      title: clean.substring(0, dashIndex).trim(),
      description: clean.substring(dashIndex + 3).trim(),
    };
  }
  return {
    title: clean,
    description: "",
  };
}

/**
 * Parses legacy Markdown or plain text into a StructuredJobDescription.
 */
function parseLegacyMarkdownToStructured(markdownText: string): StructuredJobDescription {
  const lines = markdownText.split("\n");

  let currentSection: "overview" | "responsibilities" | "required" | "preferred" | "benefits" =
    "overview";

  const overviewLines: string[] = [];
  const responsibilitiesLines: string[] = [];
  const requiredLines: string[] = [];
  const preferredLines: string[] = [];
  const benefitsLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lower = line.toLowerCase().replace(/[^a-z\s]/g, "");

    const isBulletOrList = /^[\s]*[-*+•\d.]\s+/i.test(line);
    const isHeaderLine = line.startsWith("#") || line.endsWith(":") || (!isBulletOrList && line.length < 50);

    // Section detection (only if it's not a bullet/list item)
    if (isHeaderLine) {
      if (
        lower.includes("overview") ||
        lower.includes("about the role") ||
        lower.includes("about the job") ||
        lower.includes("position summary")
      ) {
        currentSection = "overview";
        continue;
      } else if (
        lower.includes("responsibilit") ||
        lower.includes("what you will do") ||
        lower.includes("what youll do") ||
        lower.includes("key duties")
      ) {
        currentSection = "responsibilities";
        continue;
      } else if (
        lower.includes("preferred qualification") ||
        lower.includes("nice to have") ||
        lower.includes("bonus") ||
        lower.includes("preferred skills")
      ) {
        currentSection = "preferred";
        continue;
      } else if (
        lower.includes("required qualification") ||
        lower.includes("must have") ||
        lower.includes("requirements") ||
        lower.includes("what we are looking for") ||
        lower.includes("what you need")
      ) {
        currentSection = "required";
        continue;
      } else if (
        lower.includes("benefit") ||
        lower.includes("perk") ||
        lower.includes("why join") ||
        lower.includes("what we offer")
      ) {
        currentSection = "benefits";
        continue;
      }
    }

    // Append to current section
    const cleanText = stripMarkdown(line);
    if (!cleanText) continue;

    if (currentSection === "overview") {
      overviewLines.push(cleanText);
    } else if (currentSection === "responsibilities") {
      responsibilitiesLines.push(cleanText);
    } else if (currentSection === "required") {
      requiredLines.push(cleanText);
    } else if (currentSection === "preferred") {
      preferredLines.push(cleanText);
    } else if (currentSection === "benefits") {
      benefitsLines.push(cleanText);
    }
  }

  // If nothing was categorized in sections, put entire text in overview
  if (
    responsibilitiesLines.length === 0 &&
    requiredLines.length === 0 &&
    preferredLines.length === 0 &&
    benefitsLines.length === 0
  ) {
    return {
      overview: stripMarkdown(markdownText),
      responsibilities: [],
      requiredQualifications: [],
      preferredQualifications: [],
      benefits: [],
    };
  }

  return {
    overview: overviewLines.join(" ").trim(),
    responsibilities: responsibilitiesLines.map(splitTitleDescription),
    requiredQualifications: requiredLines.map(splitTitleDescription),
    preferredQualifications: preferredLines,
    benefits: benefitsLines,
  };
}

/**
 * Formats structured job description into clean, human-readable recruiter text without raw Markdown symbols.
 */
export function formatStructuredDescriptionAsText(
  structured: StructuredJobDescription
): string {
  const parts: string[] = [];

  if (structured.overview) {
    parts.push(`ROLE OVERVIEW\n${structured.overview}`);
  }

  if (structured.responsibilities && structured.responsibilities.length > 0) {
    const resps = structured.responsibilities
      .map((r) => (r.description ? `${r.title}\n${r.description}` : r.title))
      .join("\n\n");
    parts.push(`KEY RESPONSIBILITIES\n${resps}`);
  }

  if (
    structured.requiredQualifications &&
    structured.requiredQualifications.length > 0
  ) {
    const reqs = structured.requiredQualifications
      .map((r) => (r.description ? `${r.title}\n${r.description}` : r.title))
      .join("\n\n");
    parts.push(`REQUIRED QUALIFICATIONS\n${reqs}`);
  }

  if (
    structured.preferredQualifications &&
    structured.preferredQualifications.length > 0
  ) {
    const prefs = structured.preferredQualifications
      .map((p) => `• ${p}`)
      .join("\n");
    parts.push(`PREFERRED QUALIFICATIONS\n${prefs}`);
  }

  if (structured.benefits && structured.benefits.length > 0) {
    const bens = structured.benefits.map((b) => `• ${b}`).join("\n");
    parts.push(`BENEFITS & PERKS\n${bens}`);
  }

  return parts.join("\n\n");
}
