/**
 * Requirement Normalizer & Taxonomy Engine
 * 
 * Provides comprehensive alias mapping, acronym expansions, education hierarchy rank,
 * and controlled semantic relationships for production-grade resume screening.
 */

import {
  SKILL_REGISTRY,
  getCanonicalSkillKey,
  getSkillHierarchyRelationship,
  cleanKeyText,
} from "./skill-registry";

export type MatchClassification =
  | "EXACT_MATCH"
  | "ALIAS_MATCH"
  | "HIERARCHICAL_MATCH"
  | "SEMANTIC_MATCH"
  | "PARTIAL_MATCH"
  | "NO_MATCH";

export interface NormalizedRequirement {
  originalTitle: string;
  normalizedKey: string;
  type: "SKILL" | "EXPERIENCE" | "EDUCATION" | "ACADEMIC_STATUS" | "CERTIFICATION" | "CUSTOM";
  aliases: string[];
  relatedTerms: string[];
  regexPatterns: RegExp[];
  minYears?: number;
  requiredDegreeLevel?: string;
  requiredDegreeRank?: number;
  academicStatusRule?: "FINAL_YEAR_OR_GRADUATE" | "GRADUATE" | "FINAL_YEAR" | "ENROLLED" | "COMPLETED_EDUCATION";
}

/**
 * Standard Education Degree Ranks (Explicit Hierarchy)
 * HIGH_SCHOOL < INTERMEDIATE < DIPLOMA < ASSOCIATE < BACHELOR < MASTER < PHD
 */
export const DEGREE_RANKS: Record<string, number> = {
  high_school: 1,
  intermediate: 2,
  diploma: 3,
  associate: 4,
  bachelor: 5,
  master: 6,
  phd: 7,
};

/**
 * Clean and normalize a requirement or skill title string into an alphanumeric key.
 */
export function cleanKey(str: string): string {
  return cleanKeyText(str);
}

/**
 * Escapes regex special characters safely.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Creates robust word-boundary regex patterns for a term or phrase.
 */
export function buildWordBoundaryRegex(term: string): RegExp {
  const escaped = escapeRegex(term.trim());
  const flexible = escaped.replace(/\\\s+/g, "[\\s&/,-]+");
  return new RegExp(`(^|[^a-zA-Z0-9_])${flexible}([^a-zA-Z0-9_]|$)`, "i");
}

/**
 * Normalizes any recruiter requirement title and extracts:
 * - Canonical aliases
 * - Related controlled semantic terms
 * - Regex boundary searchers
 * - Education hierarchy rank
 * - Academic status rules
 */
export function normalizeRequirement(
  rawTitle: string,
  specifiedType?: string
): NormalizedRequirement {
  const cleaned = cleanKey(rawTitle);
  const lower = rawTitle.toLowerCase().trim();

  // Determine requirement type
  let type: NormalizedRequirement["type"] =
    (specifiedType as any) || "SKILL";

  if (
    lower.includes("experience") ||
    lower.includes("years") ||
    lower.includes("yrs") ||
    /\b\d+\+?\s*(year|yr)s?\b/i.test(lower)
  ) {
    type = "EXPERIENCE";
  } else if (
    lower.includes("academic status") ||
    lower.includes("final year") ||
    lower.includes("enrolled") ||
    lower.includes("currently studying") ||
    lower.includes("student")
  ) {
    type = "ACADEMIC_STATUS";
  } else if (
    lower.includes("degree") ||
    lower.includes("bachelor") ||
    lower.includes("master") ||
    lower.includes("phd") ||
    lower.includes("intermediate") ||
    lower.includes("dae") ||
    lower.includes("diploma") ||
    lower.includes("high school") ||
    lower.includes("bs cs") ||
    lower.includes("bs computer") ||
    lower.includes("b.sc") ||
    lower.includes("b.s") ||
    lower.includes("graduate")
  ) {
    type = "EDUCATION";
  } else if (
    lower.includes("nebosh") ||
    lower.includes("osha") ||
    lower.includes("iosh") ||
    lower.includes("certified") ||
    lower.includes("certification") ||
    lower.includes("license") ||
    lower.includes("pmp") ||
    lower.includes("iso 45001") ||
    lower.includes("first aid")
  ) {
    type = "CERTIFICATION";
  }

  // Canonical skill key from Registry
  const canonicalKey = getCanonicalSkillKey(rawTitle);
  const skillDef = SKILL_REGISTRY[canonicalKey];

  const aliasesSet = new Set<string>();
  const relatedSet = new Set<string>();

  // Add raw title and cleaned key
  aliasesSet.add(rawTitle.trim());
  aliasesSet.add(cleaned);

  if (skillDef) {
    skillDef.aliases.forEach((a) => aliasesSet.add(a));
    if (skillDef.children) {
      skillDef.children.forEach((c) => {
        const childDef = SKILL_REGISTRY[c];
        if (childDef) {
          relatedSet.add(childDef.displayName);
          childDef.aliases.forEach((ca) => relatedSet.add(ca));
        }
      });
    }
    if (skillDef.associatedEntities) {
      skillDef.associatedEntities.forEach((e) => relatedSet.add(e));
    }
  }

  let requiredDegreeRank: number | undefined;
  let requiredDegreeLevel: string | undefined;
  let academicStatusRule: NormalizedRequirement["academicStatusRule"];

  // Education rank resolution
  if (type === "EDUCATION") {
    if (lower.includes("phd") || lower.includes("doctorate")) {
      requiredDegreeRank = DEGREE_RANKS.phd;
      requiredDegreeLevel = "PHD";
      aliasesSet.add("phd");
      aliasesSet.add("doctorate");
    } else if (lower.includes("master") || lower.includes("ms") || lower.includes("msc") || lower.includes("mba")) {
      requiredDegreeRank = DEGREE_RANKS.master;
      requiredDegreeLevel = "MASTER";
      aliasesSet.add("master");
      aliasesSet.add("masters");
      aliasesSet.add("ms");
      aliasesSet.add("msc");
    } else if (
      lower.includes("bachelor") ||
      lower.includes("bs") ||
      lower.includes("bsc") ||
      lower.includes("undergraduate") ||
      lower.includes("graduate") ||
      lower.includes("b.e") ||
      lower.includes("b.tech")
    ) {
      requiredDegreeRank = DEGREE_RANKS.bachelor;
      requiredDegreeLevel = "BACHELOR";
      aliasesSet.add("bachelor");
      aliasesSet.add("bachelors");
      aliasesSet.add("bs");
      aliasesSet.add("bsc");
      aliasesSet.add("b.sc");
      aliasesSet.add("b.s");
      aliasesSet.add("b.tech");
      aliasesSet.add("b.e");
      aliasesSet.add("bba");
      aliasesSet.add("bcs");
    } else if (lower.includes("dae") || lower.includes("diploma")) {
      requiredDegreeRank = DEGREE_RANKS.diploma;
      requiredDegreeLevel = "DIPLOMA";
      aliasesSet.add("dae");
      aliasesSet.add("diploma");
      aliasesSet.add("associate engineer");
      aliasesSet.add("diploma of associate engineering");
    } else if (lower.includes("intermediate") || lower.includes("fsc") || lower.includes("ics") || lower.includes("hssc")) {
      requiredDegreeRank = DEGREE_RANKS.intermediate;
      requiredDegreeLevel = "INTERMEDIATE";
      aliasesSet.add("intermediate");
      aliasesSet.add("fsc");
      aliasesSet.add("ics");
      aliasesSet.add("hssc");
      aliasesSet.add("a level");
    } else if (lower.includes("high school") || lower.includes("matric") || lower.includes("ssc")) {
      requiredDegreeRank = DEGREE_RANKS.high_school;
      requiredDegreeLevel = "HIGH_SCHOOL";
      aliasesSet.add("high school");
      aliasesSet.add("matric");
      aliasesSet.add("ssc");
    }
  }

  // Extract Experience minimum years if applicable
  let minYears: number | undefined;
  const expMatch = lower.match(/(\d+)(?:\+)?\s*(?:years?|yrs?)/i);
  if (expMatch) {
    minYears = parseInt(expMatch[1], 10);
  }

  // Academic Status rules
  if (
    lower.includes("final year or graduate") ||
    lower.includes("final-year or graduate") ||
    lower.includes("final year / graduate") ||
    lower.includes("final year or graduated")
  ) {
    type = "ACADEMIC_STATUS";
    academicStatusRule = "FINAL_YEAR_OR_GRADUATE";
    aliasesSet.add("final year or graduate");
    aliasesSet.add("final year");
    aliasesSet.add("graduated");
    aliasesSet.add("graduate");
  } else if (
    lower.includes("final year") ||
    lower.includes("final-year") ||
    lower.includes("senior year") ||
    lower.includes("4th year")
  ) {
    type = "ACADEMIC_STATUS";
    academicStatusRule = "FINAL_YEAR";
    aliasesSet.add("final year");
    aliasesSet.add("final year student");
  } else if (
    lower === "graduate" ||
    lower === "graduated" ||
    lower === "university graduate" ||
    lower.includes("completed degree")
  ) {
    type = "ACADEMIC_STATUS";
    academicStatusRule = "GRADUATE";
    aliasesSet.add("graduate");
    aliasesSet.add("graduated");
    aliasesSet.add("degree completed");
  }

  // Build regex list
  const regexPatterns: RegExp[] = [];
  Array.from(aliasesSet).forEach((alias) => {
    if (alias.length >= 2) {
      try {
        regexPatterns.push(buildWordBoundaryRegex(alias));
      } catch {
        // Fallback
      }
    }
  });

  return {
    originalTitle: rawTitle,
    normalizedKey: canonicalKey || cleaned,
    type,
    aliases: Array.from(aliasesSet),
    relatedTerms: Array.from(relatedSet),
    regexPatterns,
    minYears,
    requiredDegreeLevel,
    requiredDegreeRank,
    academicStatusRule,
  };
}

/**
 * Classify a match between a requirement and candidate text snippet.
 */
export function classifyMatch(
  requirementTitle: string,
  candidateSnippet: string
): MatchClassification {
  if (!candidateSnippet || !requirementTitle) return "NO_MATCH";

  const normReq = normalizeRequirement(requirementTitle);
  const snippetClean = cleanKey(candidateSnippet);
  const reqClean = cleanKey(requirementTitle);

  // 1. Exact match
  if (snippetClean === reqClean || candidateSnippet.toLowerCase().includes(requirementTitle.toLowerCase())) {
    return "EXACT_MATCH";
  }

  // 2. Alias match
  for (const pattern of normReq.regexPatterns) {
    if (pattern.test(candidateSnippet)) {
      return "ALIAS_MATCH";
    }
  }

  // 3. Hierarchical relationship match
  const hier = getSkillHierarchyRelationship(candidateSnippet, requirementTitle);
  if (hier.relation === "CHILD_OF_REQ") {
    return "EXACT_MATCH";
  } else if (hier.relation === "PARENT_OF_REQ") {
    return "PARTIAL_MATCH";
  }

  // 4. Controlled Semantic match
  for (const term of normReq.relatedTerms) {
    const termClean = cleanKey(term);
    if (snippetClean.includes(termClean) || buildWordBoundaryRegex(term).test(candidateSnippet)) {
      return "SEMANTIC_MATCH";
    }
  }

  // 5. Token overlap partial match
  const reqTokens = reqClean.split(" ").filter((t) => t.length > 2);
  const matchedTokens = reqTokens.filter((t) => snippetClean.includes(t));
  if (reqTokens.length > 0 && matchedTokens.length / reqTokens.length >= 0.5) {
    return "PARTIAL_MATCH";
  }

  return "NO_MATCH";
}
