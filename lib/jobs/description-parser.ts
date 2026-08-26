import { z } from "zod";

/**
 * Structured Job Description Schema
 * Canonical interface for clean, recruiter-friendly job descriptions without raw Markdown.
 *
 * Formatting hierarchy:
 * 1. Main Sections (Role Overview, Key Responsibilities, Required Qualifications, Preferred Qualifications, Benefits)
 * 2. Individual Labels (bold, concise category/skill names)
 * 3. Definitions/Descriptions (normal-weight text)
 */
export interface ResponsibilityItem {
  title: string;
  description: string;
}

export interface QualificationItem {
  label: string;
  title: string; // alias for backwards compatibility
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
        label: z.string().optional(),
        title: z.string().optional(),
        description: z.string().default(""),
      })
    )
    .default([]),
  preferredQualifications: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
});

/**
 * Strips all Markdown syntax characters (###, ##, #, ####, **, *, -, `, _) from a string.
 */
export function stripMarkdown(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/^#{1,6}\s+/gm, "") // remove leading #, ##, ###, #### headers
    .replace(/\*\*(.*?)\*\*/g, "$1") // remove **bold**
    .replace(/__(.*?)__/g, "$1") // remove __bold__
    .replace(/\*(.*?)\*/g, "$1") // remove *italic*
    .replace(/_(.*?)_/g, "$1") // remove _italic_
    .replace(/^[\s]*[-*+•]\s+/gm, "") // remove list bullets -, *, +, •
    .replace(/^[\s]*\d+\.\s+/gm, "") // remove numbered lists 1. , 2.
    .replace(/`([^`]+)`/g, "$1") // remove inline code `code`
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .trim();
}

/**
 * Normalizes labels like "Years of Experience" -> "Experience"
 */
function cleanLabel(label: string): string {
  const clean = stripMarkdown(label).trim();
  if (/^years of experience$/i.test(clean)) return "Experience";
  if (/^minimum experience$/i.test(clean)) return "Experience";
  if (/^education requirement$/i.test(clean)) return "Education";
  if (/^educational background$/i.test(clean)) return "Education";
  return clean;
}

/**
 * Splits a text line into label/title and description if separated by colon or dash.
 */
function splitLabelAndDescription(text: string): { label: string; title: string; description: string } {
  const clean = stripMarkdown(text);
  const colonIndex = clean.indexOf(":");
  if (colonIndex > 0 && colonIndex < 60) {
    const lbl = cleanLabel(clean.substring(0, colonIndex));
    return {
      label: lbl,
      title: lbl,
      description: clean.substring(colonIndex + 1).trim(),
    };
  }
  const dashIndex = clean.indexOf(" - ");
  if (dashIndex > 0 && dashIndex < 60) {
    const lbl = cleanLabel(clean.substring(0, dashIndex));
    return {
      label: lbl,
      title: lbl,
      description: clean.substring(dashIndex + 3).trim(),
    };
  }
  const lbl = cleanLabel(clean);
  return {
    label: lbl,
    title: lbl,
    description: "",
  };
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
          (item: any) => {
            if (typeof item === "string") {
              const split = splitLabelAndDescription(item);
              return { title: split.title, description: split.description };
            }
            return {
              title: stripMarkdown(String(item.title || item.label || "")),
              description: stripMarkdown(String(item.description || "")),
            };
          }
        ),
        requiredQualifications: (Array.isArray(raw.requiredQualifications)
          ? raw.requiredQualifications
          : []
        ).map((item: any) => {
          if (typeof item === "string") {
            return splitLabelAndDescription(item);
          }
          const lbl = cleanLabel(String(item.label || item.title || ""));
          return {
            label: lbl,
            title: lbl,
            description: stripMarkdown(String(item.description || "")),
          };
        }),
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
 * Parses legacy Markdown or plain text into a StructuredJobDescription.
 */
function parseLegacyMarkdownToStructured(markdownText: string): StructuredJobDescription {
  // Normalize double newlines and section headers
  const lines = markdownText.split("\n");

  let currentSection: "overview" | "responsibilities" | "required" | "preferred" | "benefits" =
    "overview";

  const overviewLines: string[] = [];
  const responsibilitiesBlocks: string[] = [];
  const requiredBlocks: string[] = [];
  const preferredLines: string[] = [];
  const benefitsLines: string[] = [];

  let currentBlock: string[] = [];

  const flushBlock = () => {
    if (currentBlock.length > 0) {
      const blockText = currentBlock.join("\n").trim();
      if (blockText) {
        if (currentSection === "responsibilities") {
          responsibilitiesBlocks.push(blockText);
        } else if (currentSection === "required") {
          requiredBlocks.push(blockText);
        }
      }
      currentBlock = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushBlock();
      continue;
    }

    const lower = line.toLowerCase().replace(/[^a-z\s]/g, "").trim();
    const isBulletOrList = /^[\s]*[-*+•\d.]\s+/i.test(rawLine);
    const isHeaderLine =
      rawLine.startsWith("#") ||
      rawLine.endsWith(":") ||
      (!isBulletOrList &&
        (lower === "role overview" ||
          lower === "about the role" ||
          lower === "position summary" ||
          lower === "key responsibilities" ||
          lower === "responsibilities" ||
          lower === "what you will do" ||
          lower === "required qualifications" ||
          lower === "requirements" ||
          lower === "what we are looking for" ||
          lower === "preferred qualifications" ||
          lower === "bonus skills" ||
          lower === "benefits perks" ||
          lower === "benefits" ||
          lower === "what we offer"));

    // Section detection
    if (isHeaderLine) {
      if (
        lower.includes("overview") ||
        lower.includes("about the role") ||
        lower.includes("about the job") ||
        lower.includes("position summary")
      ) {
        flushBlock();
        currentSection = "overview";
        continue;
      } else if (
        lower.includes("responsibilit") ||
        lower.includes("what you will do") ||
        lower.includes("key duties")
      ) {
        flushBlock();
        currentSection = "responsibilities";
        continue;
      } else if (
        lower.includes("preferred qualification") ||
        lower.includes("nice to have") ||
        lower.includes("bonus") ||
        lower.includes("preferred skills")
      ) {
        flushBlock();
        currentSection = "preferred";
        continue;
      } else if (
        lower.includes("required qualification") ||
        lower.includes("must have") ||
        lower.includes("requirements") ||
        lower.includes("what we are looking for") ||
        lower.includes("what you need")
      ) {
        flushBlock();
        currentSection = "required";
        continue;
      } else if (
        lower.includes("benefit") ||
        lower.includes("perk") ||
        lower.includes("why join") ||
        lower.includes("what we offer")
      ) {
        flushBlock();
        currentSection = "benefits";
        continue;
      }
    }

    const cleanText = stripMarkdown(line);
    if (!cleanText) continue;

    if (currentSection === "overview") {
      overviewLines.push(cleanText);
    } else if (currentSection === "responsibilities" || currentSection === "required") {
      if (isBulletOrList) {
        flushBlock();
      }
      currentBlock.push(cleanText);
      if (isBulletOrList) {
        flushBlock();
      }
    } else if (currentSection === "preferred") {
      preferredLines.push(cleanText);
    } else if (currentSection === "benefits") {
      benefitsLines.push(cleanText);
    }
  }

  flushBlock();

  // If nothing was categorized in sections, put entire text in overview
  if (
    responsibilitiesBlocks.length === 0 &&
    requiredBlocks.length === 0 &&
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

  // Parse structured blocks
  const parseBlocks = (blocks: string[]) => {
    const result: QualificationItem[] = [];
    for (const block of blocks) {
      const bLines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (bLines.length >= 2) {
        const lbl = cleanLabel(bLines[0]);
        result.push({
          label: lbl,
          title: lbl,
          description: bLines.slice(1).join(" "),
        });
      } else if (bLines.length === 1) {
        result.push(splitLabelAndDescription(bLines[0]));
      }
    }
    return result;
  };

  const parsedResponsibilities = parseBlocks(responsibilitiesBlocks).map((item) => ({
    title: item.label,
    description: item.description,
  }));

  const parsedRequired = parseBlocks(requiredBlocks);

  return {
    overview: overviewLines.join(" ").trim(),
    responsibilities: parsedResponsibilities,
    requiredQualifications: parsedRequired,
    preferredQualifications: preferredLines,
    benefits: benefitsLines,
  };
}

/**
 * Formats structured job description into clean, human-readable recruiter text without raw Markdown symbols.
 * Format:
 * Role Overview
 * [description]
 *
 * Key Responsibilities
 * [Title]
 * [Description]
 *
 * Required Qualifications
 * [Label]
 * [Description]
 *
 * Preferred Qualifications
 * • [Item]
 *
 * Benefits & Perks
 * • [Item]
 */
export function formatStructuredDescriptionAsText(
  structured: StructuredJobDescription
): string {
  const parts: string[] = [];

  if (structured.overview) {
    parts.push(`Role Overview\n\n${structured.overview}`);
  }

  if (structured.responsibilities && structured.responsibilities.length > 0) {
    const resps = structured.responsibilities
      .map((r) => {
        const title = r.title || "";
        return r.description ? `${title}\n${r.description}` : title;
      })
      .join("\n\n");
    parts.push(`Key Responsibilities\n\n${resps}`);
  }

  if (
    structured.requiredQualifications &&
    structured.requiredQualifications.length > 0
  ) {
    const reqs = structured.requiredQualifications
      .map((r) => {
        const label = r.label || r.title || "";
        return r.description ? `${label}\n${r.description}` : label;
      })
      .join("\n\n");
    parts.push(`Required Qualifications\n\n${reqs}`);
  }

  if (
    structured.preferredQualifications &&
    structured.preferredQualifications.length > 0
  ) {
    const prefs = structured.preferredQualifications
      .map((p) => `• ${p}`)
      .join("\n");
    parts.push(`Preferred Qualifications\n\n${prefs}`);
  }

  if (structured.benefits && structured.benefits.length > 0) {
    const bens = structured.benefits.map((b) => `• ${b}`).join("\n");
    parts.push(`Benefits & Perks\n\n${bens}`);
  }

  return parts.join("\n\n");
}
