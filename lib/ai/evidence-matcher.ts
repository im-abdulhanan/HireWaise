/**
 * Multi-Layer Evidence-First Resume Matcher Engine
 * 
 * Evaluates job requirements against raw parsed resume text and structured resume data
 * using deterministic textual priority:
 * 1. Direct Verbatim Match (EXACT)
 * 2. Alias Registry Match (ALIAS)
 * 3. Contextual Action & Responsibility Verification (EVIDENCE_VERIFIED)
 * 4. Hierarchical Parent/Child Skill Relationship (HIERARCHICAL)
 * 5. Controlled Semantic Similarity (SEMANTIC)
 * 6. Non-match (NOT_FOUND)
 */

import { CandidateResumeExtraction, ExperienceItem, EducationItem } from "./schemas";
import {
  normalizeRequirement,
  buildWordBoundaryRegex,
  cleanKey,
  DEGREE_RANKS,
} from "./requirement-normalizer";
import {
  getCanonicalSkillKey,
  getSkillHierarchyRelationship,
  checkActionEvidenceInContext,
  calculateSemanticSimilarity,
  SKILL_REGISTRY,
} from "./skill-registry";

export type MatchStatus = "MATCHED" | "PARTIAL" | "NOT_FOUND" | "UNCLEAR";
export type MatchMethod =
  | "EXACT"
  | "ALIAS"
  | "HIERARCHICAL"
  | "SEMANTIC"
  | "EVIDENCE_VERIFIED"
  | "NONE";

export interface RequirementMatchOutcome {
  status: MatchStatus;
  matchType: MatchMethod;
  matchMethod: MatchMethod;
  evidenceQuote: string | null;
  evidenceSource: "RAW_RESUME" | "STRUCTURED_RESUME" | "GEMINI_VERIFIED" | "NONE";
  confidence: number;
  reasoning: string;
  requirementId?: string;
  requirementTitle?: string;
  requirementType?: string;
  requirementCategory?: string;
  normalizedRequirement?: string;
  matchedCandidateSkill?: string;
}

export interface JobRequirementInput {
  _id?: any;
  id?: string;
  title: string;
  type?: "SKILL" | "EXPERIENCE" | "EDUCATION" | "ACADEMIC_STATUS" | "CERTIFICATION" | "CUSTOM";
  category?: "REQUIRED" | "PREFERRED" | "OPTIONAL";
  minimumValue?: number;
  description?: string;
}

/**
 * Extracts the clean contiguous line or sentence containing the matched keyword/phrase from raw text.
 */
export function extractEvidenceSentenceOrLine(rawText: string, keyword: string): string {
  if (!rawText || !keyword) return "";

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const keywordRegex = buildWordBoundaryRegex(keyword);

  // 1. Check exact line match
  for (const line of lines) {
    if (keywordRegex.test(line) || line.toLowerCase().includes(keyword.toLowerCase())) {
      const cleaned = line.replace(/^[•*\-–—|>\s]+/, "").trim();
      if (cleaned.length >= 3) {
        return cleaned;
      }
    }
  }

  // 2. Search across sentences in paragraph text
  const sentences = rawText.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    if (keywordRegex.test(sentence) || sentence.toLowerCase().includes(keyword.toLowerCase())) {
      const trimmed = sentence.trim().replace(/^[\s•*\-–—|>]+/, "");
      if (trimmed.length > 160) {
        const idx = trimmed.toLowerCase().indexOf(keyword.toLowerCase());
        const start = Math.max(0, idx - 40);
        const end = Math.min(trimmed.length, idx + keyword.length + 70);
        return trimmed.substring(start, end).trim();
      }
      return trimmed;
    }
  }

  return "";
}

/**
 * Parses start and end dates from experience strings and returns timestamp ranges.
 */
function parseDateRange(
  startStr?: string,
  endStr?: string,
  isCurrent?: boolean
): { startMs: number; endMs: number } | null {
  const currentMs = Date.now();

  const parseDate = (str?: string, isEnd = false): number | null => {
    if (!str) return null;
    const trimmed = str.trim();
    if (/present|current|ongoing|now/i.test(trimmed)) {
      return currentMs;
    }

    // Check ISO or YYYY-MM or YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = isoMatch[2] ? parseInt(isoMatch[2], 10) - 1 : isEnd ? 11 : 0;
      const day = isoMatch[3] ? parseInt(isoMatch[3], 10) : isEnd ? 28 : 1;
      return new Date(year, month, day).getTime();
    }

    // Check Month Year e.g. "Jan 2021" or "January 2021"
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthYearMatch = trimmed.match(/([a-zA-Z]+)[,\s]+(\d{4})/);
    if (monthYearMatch) {
      const mStr = monthYearMatch[1].slice(0, 3).toLowerCase();
      const mIdx = months.indexOf(mStr);
      const year = parseInt(monthYearMatch[2], 10);
      const month = mIdx >= 0 ? mIdx : isEnd ? 11 : 0;
      return new Date(year, month, isEnd ? 28 : 1).getTime();
    }

    const yearMatch = trimmed.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      return isEnd ? new Date(year, 11, 31).getTime() : new Date(year, 0, 1).getTime();
    }

    return null;
  };

  const startMs = parseDate(startStr, false);
  let endMs = isCurrent ? currentMs : parseDate(endStr, true);

  if (!startMs) return null;
  if (!endMs) endMs = startMs + 365.25 * 24 * 3600 * 1000;

  return { startMs, endMs: Math.max(startMs, endMs) };
}

/**
 * Merges overlapping employment intervals to calculate true total work experience (Date Union).
 */
export function calculateMergedExperienceYears(experiences: ExperienceItem[]): number {
  if (!experiences || experiences.length === 0) return 0;

  const intervals: Array<{ startMs: number; endMs: number }> = [];

  for (const exp of experiences) {
    const range = parseDateRange(exp.startDate, exp.endDate, exp.isCurrent);
    if (range) {
      intervals.push(range);
    } else if (exp.durationYears && exp.durationYears > 0) {
      const endMs = Date.now();
      const startMs = endMs - exp.durationYears * 365.25 * 24 * 3600 * 1000;
      intervals.push({ startMs, endMs });
    }
  }

  if (intervals.length === 0) return 0;

  // Sort intervals by start time
  intervals.sort((a, b) => a.startMs - b.startMs);

  // Merge overlapping intervals
  const merged: Array<{ startMs: number; endMs: number }> = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const last = merged[merged.length - 1];

    if (current.startMs <= last.endMs) {
      // Overlapping or adjacent
      last.endMs = Math.max(last.endMs, current.endMs);
    } else {
      merged.push(current);
    }
  }

  // Sum merged durations in years
  let totalMs = 0;
  for (const interval of merged) {
    totalMs += interval.endMs - interval.startMs;
  }

  const years = totalMs / (365.25 * 24 * 3600 * 1000);
  return Math.round(years * 10) / 10;
}

/**
 * Calculates total experience in relevant fields (e.g. HSE, Engineering, Software).
 */
export function calculateRelevantExperienceYears(
  experiences: ExperienceItem[],
  domainKeywords: string[]
): { relevantYears: number; matchedRoles: string[] } {
  if (!experiences || experiences.length === 0 || domainKeywords.length === 0) {
    return { relevantYears: 0, matchedRoles: [] };
  }

  const relevantExps: ExperienceItem[] = [];
  const matchedRoles: string[] = [];

  for (const exp of experiences) {
    const textToCheck = `${exp.jobTitle || ""} ${exp.company || ""} ${exp.description || ""} ${(exp.skillsUsed || []).join(" ")}`.toLowerCase();

    const isRelevant = domainKeywords.some((kw) => {
      const regex = buildWordBoundaryRegex(kw);
      return regex.test(textToCheck);
    });

    if (isRelevant) {
      relevantExps.push(exp);
      matchedRoles.push(`${exp.jobTitle} at ${exp.company}`);
    }
  }

  const relevantYears = calculateMergedExperienceYears(relevantExps);
  return { relevantYears, matchedRoles };
}

/**
 * Resolves degree level and rank from education records or raw text.
 * Strict ranking: HIGH_SCHOOL (1) < INTERMEDIATE (2) < DIPLOMA (3) < ASSOCIATE (4) < BACHELOR (5) < MASTER (6) < PHD (7).
 */
export function resolveEducationLevelAndRank(
  educationItems: EducationItem[],
  rawResumeText: string
): { highestLevel: string; highestRank: number; evidence: string } {
  let highestRank = 0;
  let highestLevel = "NONE";
  let evidence = "";

  const checkText = (text: string) => {
    if (!text || text.trim().length < 2) return;
    const lower = text.toLowerCase();

    if (/\b(ph\.?d|doctorate|doctor of philosophy)\b/i.test(lower)) {
      if (DEGREE_RANKS.phd > highestRank) {
        highestRank = DEGREE_RANKS.phd;
        highestLevel = "PHD";
        evidence = text.trim();
      }
    } else if (
      /\b(ms|msc|master|masters|master's|m\.?sc|m\.?s|mphil|m\.phil|mba|m\.tech|m\.eng)\b/i.test(lower) &&
      !/\b(bachelor|bs|bsc|undergraduate)\b/i.test(lower)
    ) {
      if (DEGREE_RANKS.master > highestRank) {
        highestRank = DEGREE_RANKS.master;
        highestLevel = "MASTER";
        evidence = text.trim();
      }
    } else if (
      /\b(bs|bsc|bachelor|bachelors|bachelor's|b\.sc|b\.s|b\.tech|btech|b\.eng|beng|bba|bcs|bcom|undergraduate degree|4-year degree|four year degree|university graduate)\b/i.test(
        lower
      ) &&
      !/\b(dae|diploma)\b/i.test(lower)
    ) {
      if (DEGREE_RANKS.bachelor > highestRank) {
        highestRank = DEGREE_RANKS.bachelor;
        highestLevel = "BACHELOR";
        evidence = text.trim();
      }
    } else if (
      /\b(associate degree|adp|associate of science|associate of arts)\b/i.test(lower)
    ) {
      if (DEGREE_RANKS.associate > highestRank) {
        highestRank = DEGREE_RANKS.associate;
        highestLevel = "ASSOCIATE";
        evidence = text.trim();
      }
    } else if (
      /\b(dae|diploma of associate engineering|diploma in associate engineering|associate engineering|polytechnic diploma|3-year diploma|3 year diploma|associate engineer|diploma)\b/i.test(
        lower
      )
    ) {
      if (DEGREE_RANKS.diploma > highestRank) {
        highestRank = DEGREE_RANKS.diploma;
        highestLevel = "DIPLOMA";
        evidence = text.trim();
      }
    } else if (
      /\b(intermediate|fsc|f\.sc|ics|i\.cs|fa|f\.a|icom|i\.com|hssc|a level|a-level|12th grade|higher secondary)\b/i.test(
        lower
      )
    ) {
      if (DEGREE_RANKS.intermediate > highestRank) {
        highestRank = DEGREE_RANKS.intermediate;
        highestLevel = "INTERMEDIATE";
        evidence = text.trim();
      }
    } else if (/\b(matric|matriculation|ssc|o level|o-level|10th grade|high school)\b/i.test(lower)) {
      if (DEGREE_RANKS.high_school > highestRank) {
        highestRank = DEGREE_RANKS.high_school;
        highestLevel = "HIGH_SCHOOL";
        evidence = text.trim();
      }
    }
  };

  // Check structured education
  if (educationItems && educationItems.length > 0) {
    for (const edu of educationItems) {
      checkText(`${edu.degree || ""} ${edu.fieldOfStudy || ""} at ${edu.institution || ""}`);
    }
  }

  // If no structured education matched, check raw resume lines
  if (highestRank === 0 && rawResumeText) {
    const lines = rawResumeText.split(/\r?\n/);
    for (const line of lines) {
      checkText(line);
    }
  }

  return { highestLevel, highestRank, evidence };
}

/**
 * Primary Multi-Layer Evidence-First Matcher
 */
export function matchRequirementAgainstResume(
  requirement: JobRequirementInput,
  rawResumeText: string,
  structuredResume?: CandidateResumeExtraction
): RequirementMatchOutcome {
  const norm = normalizeRequirement(requirement.title, requirement.type);
  const reqTitle = requirement.title.trim();
  const reqType = requirement.type || norm.type;
  const reqCategory = requirement.category || "REQUIRED";
  const reqId = requirement._id?.toString() || requirement.id || "";
  const canonicalReqKey = norm.normalizedKey;

  const baseOutcome: RequirementMatchOutcome = {
    status: "NOT_FOUND",
    matchType: "NONE",
    matchMethod: "NONE",
    evidenceQuote: null,
    evidenceSource: "NONE",
    confidence: 95,
    reasoning: `No evidence found for requirement "${reqTitle}" in candidate resume.`,
    requirementId: reqId,
    requirementTitle: reqTitle,
    requirementType: reqType,
    requirementCategory: reqCategory,
    normalizedRequirement: canonicalReqKey,
  };

  if (!rawResumeText && !structuredResume) {
    return baseOutcome;
  }

  // =========================================================================
  // 1. EXPERIENCE REQUIREMENTS
  // =========================================================================
  if (reqType === "EXPERIENCE" || norm.minYears !== undefined) {
    const requiredYears = requirement.minimumValue || norm.minYears || 1;
    const experiences = structuredResume?.experience || [];

    // Calculate merged overall experience (date union)
    const mergedOverall = calculateMergedExperienceYears(experiences);
    const totalExpYears = Math.max(mergedOverall, structuredResume?.totalExperienceYears || 0);

    // Check if domain-specific experience was requested (e.g. "3+ years HSE experience")
    let domainSpecific = false;
    let relevantYears = totalExpYears;
    let matchedRoles: string[] = [];

    if (norm.relatedTerms.length > 0 || norm.aliases.length > 1) {
      const keywords = [...norm.aliases, ...norm.relatedTerms];
      const relCheck = calculateRelevantExperienceYears(experiences, keywords);
      if (relCheck.relevantYears > 0) {
        domainSpecific = true;
        relevantYears = relCheck.relevantYears;
        matchedRoles = relCheck.matchedRoles;
      }
    }

    const expToEvaluate = domainSpecific ? relevantYears : totalExpYears;

    if (expToEvaluate >= requiredYears) {
      const quote =
        matchedRoles.length > 0
          ? matchedRoles.join("; ")
          : `${totalExpYears} total years of experience across ${experiences.length} positions`;

      return {
        ...baseOutcome,
        status: "MATCHED",
        matchType: "EXACT",
        matchMethod: "EXACT",
        evidenceQuote: quote,
        evidenceSource: "STRUCTURED_RESUME",
        confidence: 98,
        reasoning: `Candidate possesses ${expToEvaluate} years of experience, meeting the required ${requiredYears} years.`,
      };
    } else if (expToEvaluate > 0 && expToEvaluate >= requiredYears * 0.6) {
      return {
        ...baseOutcome,
        status: "PARTIAL",
        matchType: "EXACT",
        matchMethod: "EXACT",
        evidenceQuote: `${expToEvaluate} years of experience detected`,
        evidenceSource: "STRUCTURED_RESUME",
        confidence: 90,
        reasoning: `Candidate possesses ${expToEvaluate} years of experience, partially meeting the required ${requiredYears} years.`,
      };
    } else {
      return {
        ...baseOutcome,
        status: "NOT_FOUND",
        matchType: "NONE",
        matchMethod: "NONE",
        evidenceQuote: totalExpYears > 0 ? `${totalExpYears} years total experience` : null,
        evidenceSource: totalExpYears > 0 ? "STRUCTURED_RESUME" : "NONE",
        confidence: 95,
        reasoning: `Candidate possesses only ${expToEvaluate} years of relevant experience, which is below the required ${requiredYears} years.`,
      };
    }
  }

  // =========================================================================
  // 2. EDUCATION & DEGREE HIERARCHY REQUIREMENTS
  // =========================================================================
  if (reqType === "EDUCATION" && norm.requiredDegreeRank !== undefined) {
    const educationItems = structuredResume?.education || [];
    const { highestLevel, highestRank, evidence } = resolveEducationLevelAndRank(
      educationItems,
      rawResumeText
    );

    const requiredRank = norm.requiredDegreeRank;

    if (highestRank >= requiredRank) {
      let quote = evidence;
      if (!quote && educationItems.length > 0) {
        const topEdu = educationItems[0];
        quote = `${topEdu.degree} in ${topEdu.fieldOfStudy || "Engineering/Science"} from ${topEdu.institution}`;
      }

      return {
        ...baseOutcome,
        status: "MATCHED",
        matchType: highestRank === requiredRank ? "EXACT" : "ALIAS",
        matchMethod: highestRank === requiredRank ? "EXACT" : "ALIAS",
        evidenceQuote: quote || `${highestLevel} degree verified`,
        evidenceSource: "RAW_RESUME",
        confidence: 98,
        reasoning: `Candidate's highest education is ${highestLevel} (Rank ${highestRank}), meeting the requirement of ${norm.requiredDegreeLevel} (Rank ${requiredRank}).`,
      };
    } else if (highestRank > 0) {
      return {
        ...baseOutcome,
        status: "NOT_FOUND",
        matchType: "NONE",
        matchMethod: "NONE",
        evidenceQuote: evidence || `${highestLevel} qualification`,
        evidenceSource: "RAW_RESUME",
        confidence: 98,
        reasoning: `Candidate holds ${highestLevel} (Rank ${highestRank}), which does not satisfy the required ${norm.requiredDegreeLevel} (Rank ${requiredRank}).`,
      };
    } else {
      return {
        ...baseOutcome,
        status: "NOT_FOUND",
        matchType: "NONE",
        matchMethod: "NONE",
        evidenceQuote: null,
        evidenceSource: "NONE",
        confidence: 95,
        reasoning: `No education record found meeting the requirement for ${reqTitle}.`,
      };
    }
  }

  // =========================================================================
  // 3. ACADEMIC STATUS REQUIREMENTS (e.g. "Final year or Graduate", "Graduate")
  // =========================================================================
  if (reqType === "ACADEMIC_STATUS" || norm.academicStatusRule) {
    if (structuredResume) {
      const { evaluateAcademicStatusRequirement } = require("./matcher");
      const evalRes = evaluateAcademicStatusRequirement({
        title: reqTitle,
        normalizedKey: norm.normalizedKey,
        candidate: structuredResume,
      });

      return {
        ...baseOutcome,
        status: evalRes.status,
        matchType:
          evalRes.status === "MATCHED"
            ? "EXACT"
            : evalRes.status === "PARTIAL"
            ? "HIERARCHICAL"
            : "NONE",
        matchMethod:
          evalRes.status === "MATCHED"
            ? "EXACT"
            : evalRes.status === "PARTIAL"
            ? "HIERARCHICAL"
            : "NONE",
        evidenceQuote: evalRes.evidenceQuote || null,
        evidenceSource: evalRes.evidenceQuote ? "STRUCTURED_RESUME" : "NONE",
        confidence: evalRes.confidence,
        reasoning: evalRes.reasoning,
      };
    }
  }

  // =========================================================================
  // 4. CONTEXTUAL ACTION & RESPONSIBILITY VERIFICATION (Specialized Skills)
  // Example: "Linux Administration" -> searches for administrative actions on servers
  // =========================================================================
  const actionCheck = checkActionEvidenceInContext(rawResumeText, structuredResume, canonicalReqKey);
  if (actionCheck.hasEvidence) {
    return {
      ...baseOutcome,
      status: "MATCHED",
      matchType: "EVIDENCE_VERIFIED",
      matchMethod: "EVIDENCE_VERIFIED",
      evidenceQuote: actionCheck.evidenceQuote,
      evidenceSource: "RAW_RESUME",
      confidence: actionCheck.confidence,
      reasoning: actionCheck.reasoning,
      matchedCandidateSkill: reqTitle,
    };
  }

  // =========================================================================
  // 5. DIRECT RAW RESUME TEXT MATCH (Exact & Aliases)
  // Priority 1: Exact textual match in raw resume text
  // =========================================================================
  const exactRegex = buildWordBoundaryRegex(reqTitle);
  if (exactRegex.test(rawResumeText)) {
    const quote = extractEvidenceSentenceOrLine(rawResumeText, reqTitle);
    return {
      ...baseOutcome,
      status: "MATCHED",
      matchType: "EXACT",
      matchMethod: "EXACT",
      evidenceQuote: quote || reqTitle,
      evidenceSource: "RAW_RESUME",
      confidence: 98,
      reasoning: `Direct verbatim textual match for "${reqTitle}" found in resume.`,
      matchedCandidateSkill: reqTitle,
    };
  }

  // Priority 2: Alias match in raw resume text
  for (const alias of norm.aliases) {
    if (alias.length >= 2) {
      const aliasRegex = buildWordBoundaryRegex(alias);
      if (aliasRegex.test(rawResumeText)) {
        const quote = extractEvidenceSentenceOrLine(rawResumeText, alias);
        return {
          ...baseOutcome,
          status: "MATCHED",
          matchType: "ALIAS",
          matchMethod: "ALIAS",
          evidenceQuote: quote || alias,
          evidenceSource: "RAW_RESUME",
          confidence: 95,
          reasoning: `Direct textual match for alias "${alias}" (${reqTitle}) found in resume.`,
          matchedCandidateSkill: alias,
        };
      }
    }
  }

  // =========================================================================
  // 6. STRUCTURED RESUME DATA MATCH
  // Priority 3: Structured resume certifications, skills, and experience items
  // =========================================================================
  if (structuredResume) {
    // Check certifications
    for (const cert of structuredResume.certifications || []) {
      const certName = cert.name || "";
      for (const alias of norm.aliases) {
        const cleanAlias = cleanKey(alias);
        if (cleanAlias.length >= 3) {
          if (
            cleanKey(certName) === cleanAlias ||
            buildWordBoundaryRegex(alias).test(certName)
          ) {
            const quote = `${cert.name}${cert.issuer ? ` (${cert.issuer})` : ""}${cert.year ? ` – ${cert.year}` : ""}`;
            return {
              ...baseOutcome,
              status: "MATCHED",
              matchType: "EXACT",
              matchMethod: "EXACT",
              evidenceQuote: quote,
              evidenceSource: "STRUCTURED_RESUME",
              confidence: 95,
              reasoning: `Certification "${cert.name}" matches requirement "${reqTitle}".`,
              matchedCandidateSkill: cert.name,
            };
          }
        } else if (cleanAlias.length > 0 && cleanKey(certName) === cleanAlias) {
          const quote = `${cert.name}${cert.issuer ? ` (${cert.issuer})` : ""}${cert.year ? ` – ${cert.year}` : ""}`;
          return {
            ...baseOutcome,
            status: "MATCHED",
            matchType: "EXACT",
            matchMethod: "EXACT",
            evidenceQuote: quote,
            evidenceSource: "STRUCTURED_RESUME",
            confidence: 95,
            reasoning: `Certification "${cert.name}" matches requirement "${reqTitle}".`,
            matchedCandidateSkill: cert.name,
          };
        }
      }
    }

    // Check candidate skills and normalizedSkills
    const allCandidateSkills = [
      ...(structuredResume.skills || []),
      ...(structuredResume.normalizedSkills || []),
    ];

    // Check direct equality or alias match in candidate skills list
    for (const skill of allCandidateSkills) {
      for (const alias of norm.aliases) {
        if (cleanKey(skill) === cleanKey(alias)) {
          return {
            ...baseOutcome,
            status: "MATCHED",
            matchType: "ALIAS",
            matchMethod: "ALIAS",
            evidenceQuote: `Skill verified in candidate profile: "${skill}"`,
            evidenceSource: "STRUCTURED_RESUME",
            confidence: 94,
            reasoning: `Candidate profile lists skill "${skill}", matching requirement "${reqTitle}".`,
            matchedCandidateSkill: skill,
          };
        }
      }
    }

    // =========================================================================
    // 7. HIERARCHICAL SKILL MATCHING
    // Child covers Parent => Full MATCHED
    // Parent covers Child => PARTIAL (with honest explainable reasoning)
    // =========================================================================
    for (const candSkill of allCandidateSkills) {
      const hier = getSkillHierarchyRelationship(candSkill, reqTitle);

      if (hier.relation === "CHILD_OF_REQ") {
        return {
          ...baseOutcome,
          status: "MATCHED",
          matchType: "HIERARCHICAL",
          matchMethod: "HIERARCHICAL",
          evidenceQuote: `Skill verified in candidate profile: "${candSkill}"`,
          evidenceSource: "STRUCTURED_RESUME",
          confidence: hier.confidence,
          reasoning: `Candidate profile lists specialized skill "${candSkill}", satisfying general requirement "${reqTitle}".`,
          matchedCandidateSkill: candSkill,
        };
      } else if (hier.relation === "PARENT_OF_REQ") {
        // GENERAL PARENT LISTED FOR SPECIALIZED REQUIREMENT => PARTIAL
        // e.g. Candidate lists "Linux", Requirement is "Linux Administration"
        return {
          ...baseOutcome,
          status: "PARTIAL",
          matchType: "HIERARCHICAL",
          matchMethod: "HIERARCHICAL",
          evidenceQuote: candSkill,
          evidenceSource: "STRUCTURED_RESUME",
          confidence: hier.confidence, // 75
          reasoning: `Candidate lists ${candSkill} as a skill, but the resume does not provide sufficient evidence of ${reqTitle} responsibilities.`,
          matchedCandidateSkill: candSkill,
        };
      }
    }

    // Check work experience descriptions & skills used
    for (const exp of structuredResume.experience || []) {
      const expSkills = exp.skillsUsed || [];
      const expDesc = exp.description || "";

      for (const alias of norm.aliases) {
        if (
          expSkills.some((s) => cleanKey(s) === cleanKey(alias)) ||
          buildWordBoundaryRegex(alias).test(expDesc)
        ) {
          const quote = `${exp.jobTitle} at ${exp.company}: "${alias}"`;
          return {
            ...baseOutcome,
            status: "MATCHED",
            matchType: "ALIAS",
            matchMethod: "ALIAS",
            evidenceQuote: quote,
            evidenceSource: "STRUCTURED_RESUME",
            confidence: 93,
            reasoning: `Work history at ${exp.company} demonstrates experience with "${alias}".`,
            matchedCandidateSkill: alias,
          };
        }
      }
    }
  }

  // =========================================================================
  // 8. CONTROLLED SEMANTIC MATCHING (Supporting Evidence Only)
  // =========================================================================
  for (const term of norm.relatedTerms) {
    if (term.length >= 2) {
      const termRegex = buildWordBoundaryRegex(term);
      if (termRegex.test(rawResumeText)) {
        const quote = extractEvidenceSentenceOrLine(rawResumeText, term);
        return {
          ...baseOutcome,
          status: "MATCHED",
          matchType: "SEMANTIC",
          matchMethod: "SEMANTIC",
          evidenceQuote: quote || term,
          evidenceSource: "RAW_RESUME",
          confidence: 85,
          reasoning: `Related qualification "${term}" found in resume, satisfying "${reqTitle}".`,
          matchedCandidateSkill: term,
        };
      }
    }
  }

  // Token similarity check across candidate experiences
  if (structuredResume?.experience) {
    for (const exp of structuredResume.experience) {
      const expText = `${exp.jobTitle} ${exp.description || ""}`;
      const sim = calculateSemanticSimilarity(reqTitle, expText);
      if (sim >= 0.75) {
        return {
          ...baseOutcome,
          status: "PARTIAL",
          matchType: "SEMANTIC",
          matchMethod: "SEMANTIC",
          evidenceQuote: exp.jobTitle ? `${exp.jobTitle} at ${exp.company}` : null,
          evidenceSource: "STRUCTURED_RESUME",
          confidence: 70,
          reasoning: `Candidate's background as "${exp.jobTitle}" shows partial semantic alignment with "${reqTitle}".`,
        };
      }
    }
  }

  // =========================================================================
  // 9. NOT FOUND
  // =========================================================================
  return baseOutcome;
}
