import { IJob, IScoringWeights, IScreeningPolicy } from "@/models/Job";
import { IJobRequirement } from "@/models/JobRequirement";
import { CandidateResumeExtraction } from "./schemas";
import { ScreeningCategory, IScoreBreakdown } from "@/models/ScreeningResult";
import { MatchStatus } from "@/models/ScreeningRequirementResult";

// Common technical skill synonyms and aliases map for normalization
const SKILL_ALIASES: Record<string, string> = {
  reactjs: "react",
  "react.js": "react",
  nextjs: "next.js",
  "next.js": "next.js",
  nodejs: "node.js",
  "node.js": "node.js",
  expressjs: "express",
  "express.js": "express",
  postgres: "postgresql",
  postgresql: "postgresql",
  mongo: "mongodb",
  mongodb: "mongodb",
  k8s: "kubernetes",
  kubernetes: "kubernetes",
  docker: "docker",
  aws: "aws",
  "amazon web services": "aws",
  gcp: "gcp",
  "google cloud": "gcp",
  azure: "azure",
  ts: "typescript",
  typescript: "typescript",
  js: "javascript",
  javascript: "javascript",
  py: "python",
  python: "python",
  golang: "go",
  go: "go",
  rb: "ruby",
  ruby: "ruby",
  rails: "ruby on rails",
  "ruby on rails": "ruby on rails",
  tailwind: "tailwindcss",
  tailwindcss: "tailwindcss",
  vuejs: "vue",
  "vue.js": "vue",
  vue: "vue",
  graphql: "graphql",
  rest: "rest api",
  "rest api": "rest api",
  "restful api": "rest api",
  ci_cd: "ci/cd",
  "ci/cd": "ci/cd",
  git: "git",
  github: "git",
  prisma: "prisma",
  mongoose: "mongoose",
  sql: "sql",
  nosql: "nosql",
};

export function normalizeSkill(skill: string): string {
  if (!skill) return "";
  const cleaned = skill.toLowerCase().trim().replace(/[^a-z0-9.+/ -]/g, "");
  return SKILL_ALIASES[cleaned] || cleaned;
}

export interface EvaluatedRequirement {
  jobRequirementId: string;
  requirementTitle: string;
  requirementCategory: "REQUIRED" | "PREFERRED" | "OPTIONAL";
  requirementType: "SKILL" | "EXPERIENCE" | "EDUCATION" | "ACADEMIC_STATUS" | "CERTIFICATION" | "CUSTOM";
  status: MatchStatus;
  evidenceQuote: string;
  reasoning: string;
  confidence: number;
  scoreContribution: number;
}

export interface MatchCalculationResult {
  overallScore: number;
  category: ScreeningCategory;
  summary: string;
  confidence: number;
  humanReviewRecommended: boolean;
  humanReviewReasons: string[];
  scoreBreakdown: IScoreBreakdown;
  matchedRequirements: EvaluatedRequirement[];
  matchedRequiredSkillsCount: number;
  totalRequiredSkillsCount: number;
  matchedPreferredSkillsCount: number;
  totalPreferredSkillsCount: number;
  detectedExperienceYears: number;
  requiredExperienceYears: number;
}

/**
 * Standard degree hierarchy rank for education level comparison.
 */
export const DEGREE_RANKS: Record<string, number> = {
  high_school: 1,
  intermediate: 2,
  diploma: 3,
  bachelor: 4,
  master: 5,
  phd: 6,
};

export function getDegreeLevelAndRank(degreeText: string): { level: string; rank: number } {
  if (!degreeText) return { level: "UNKNOWN", rank: 0 };
  const lower = degreeText.toLowerCase();

  if (lower.includes("phd") || lower.includes("doctorate") || lower.includes("doctor of philosophy")) {
    return { level: "PHD", rank: DEGREE_RANKS.phd };
  }
  if (
    lower.includes("master") ||
    lower.includes("ms") ||
    lower.includes("msc") ||
    lower.includes("mphil") ||
    lower.includes("mba") ||
    lower.includes("m.e") ||
    lower.includes("m.tech")
  ) {
    return { level: "MASTER", rank: DEGREE_RANKS.master };
  }
  if (
    lower.includes("bachelor") ||
    lower.includes("bs") ||
    lower.includes("ba") ||
    lower.includes("bsc") ||
    lower.includes("b.e") ||
    lower.includes("b.tech") ||
    lower.includes("undergraduate") ||
    lower.includes("bba") ||
    lower.includes("bcs")
  ) {
    return { level: "BACHELOR", rank: DEGREE_RANKS.bachelor };
  }
  if (
    lower.includes("intermediate") ||
    lower.includes("fsc") ||
    lower.includes("ics") ||
    lower.includes("f.sc") ||
    lower.includes("i.cs") ||
    lower.includes("hssc") ||
    lower.includes("a level") ||
    lower.includes("a-level") ||
    lower.includes("12th grade") ||
    lower.includes("higher secondary")
  ) {
    return { level: "INTERMEDIATE", rank: DEGREE_RANKS.intermediate };
  }
  if (
    lower.includes("diploma") ||
    lower.includes("associate") ||
    lower.includes("dae")
  ) {
    return { level: "DIPLOMA", rank: DEGREE_RANKS.diploma };
  }
  if (
    lower.includes("high school") ||
    lower.includes("matric") ||
    lower.includes("ssc") ||
    lower.includes("o level") ||
    lower.includes("o-level") ||
    lower.includes("10th grade") ||
    lower.includes("secondary school")
  ) {
    return { level: "HIGH_SCHOOL", rank: DEGREE_RANKS.high_school };
  }

  return { level: "DIPLOMA", rank: DEGREE_RANKS.diploma };
}

/**
 * Evaluates academic status requirements such as:
 * - "Final year or Graduate"
 * - "Final year"
 * - "Graduate"
 * - "Currently enrolled"
 * - "Student"
 */
export function evaluateAcademicStatusRequirement(params: {
  title: string;
  normalizedKey?: string;
  candidate: CandidateResumeExtraction;
}): {
  status: MatchStatus;
  evidenceQuote: string;
  reasoning: string;
  confidence: number;
  scoreContribution: number;
} {
  const { title, normalizedKey = "", candidate } = params;
  const target = (title + " " + normalizedKey).toLowerCase();

  const isFinalYearOrGradReq =
    target.includes("final year or graduate") ||
    target.includes("final_year_or_graduate") ||
    (target.includes("final") && target.includes("graduat"));

  const isFinalYearReqOnly =
    !isFinalYearOrGradReq &&
    (target.includes("final year") || target.includes("final_year") || target.includes("senior year") || target.includes("4th year"));

  const isGraduateReqOnly =
    !isFinalYearOrGradReq &&
    (target.includes("graduate") || target.includes("graduated") || target.includes("degree completed"));

  const isEnrolledReqOnly =
    target.includes("currently enrolled") || target.includes("current student") || target.includes("student");

  const eduList = candidate.education || [];

  // Analyze Candidate Academic Status and Completed University Degrees
  let isGraduatedBachelorOrHigher = false;
  let isGraduatedAny = false;
  let graduationQuote = "";

  let isFinalYear = false;
  let finalYearQuote = "";

  let isEarlyEnrolled = false;
  let earlyYearQuote = "";
  let detectedYearName = "";

  let isIntermediateOnlyCompleted = false;
  let intermediateQuote = "";

  const currentYear = new Date().getFullYear();

  for (const edu of eduList) {
    const degText = `${edu.degree || ""} ${edu.fieldOfStudy || ""}`.trim();
    const { level, rank } = getDegreeLevelAndRank(degText);
    const instText = edu.institution || "University";
    const degLower = degText.toLowerCase();
    const levelLower = (edu.academicYearLevel || "").toLowerCase();
    const gradYearNum = parseInt(String(edu.graduationYear || "").replace(/\D/g, ""), 10);

    const isExplicitCompleted =
      edu.isCompleted === true ||
      edu.academicStatus === "GRADUATED" ||
      degLower.includes("completed") ||
      degLower.includes("graduated") ||
      degLower.includes("passed") ||
      levelLower.includes("graduat");

    const isExplicitFinalYear =
      edu.academicStatus === "FINAL_YEAR" ||
      degLower.includes("final year") ||
      degLower.includes("4th year") ||
      degLower.includes("fourth year") ||
      degLower.includes("senior year") ||
      levelLower.includes("final") ||
      levelLower.includes("4th") ||
      levelLower.includes("senior");

    if (level === "INTERMEDIATE" || level === "HIGH_SCHOOL") {
      if (isExplicitCompleted || (gradYearNum && gradYearNum <= currentYear && !edu.isCurrent)) {
        isIntermediateOnlyCompleted = true;
        intermediateQuote = `${degText || "Intermediate"} from ${instText}${
          gradYearNum ? ` (${gradYearNum})` : ""
        }`;
      }
      continue;
    }

    // University degree (Bachelor / Master / PhD)
    if (rank >= DEGREE_RANKS.bachelor) {
      if (isExplicitFinalYear) {
        isFinalYear = true;
        finalYearQuote = `${degText || "Bachelor's"} from ${instText} (Final Year)`;
      } else if (
        isExplicitCompleted ||
        (gradYearNum && gradYearNum <= currentYear && !edu.isCurrent && !degLower.includes("expected"))
      ) {
        isGraduatedBachelorOrHigher = true;
        isGraduatedAny = true;
        graduationQuote = `${degText || "Bachelor's"} from ${instText}${
          gradYearNum ? ` (Graduated ${gradYearNum})` : " (Graduated)"
        }`;
      } else if (
        edu.isCurrent ||
        edu.academicStatus === "ENROLLED" ||
        degLower.includes("studying") ||
        degLower.includes("enrolled") ||
        (gradYearNum && gradYearNum > currentYear)
      ) {
        isEarlyEnrolled = true;
        detectedYearName = edu.academicYearLevel || "Enrolled Student";
        earlyYearQuote = `${degText || "Bachelor's"} at ${instText} (${detectedYearName})`;
      }
    }
  }

  // 1. "Final year or Graduate" (OR condition)
  if (isFinalYearOrGradReq) {
    if (isGraduatedBachelorOrHigher) {
      return {
        status: "MATCHED",
        evidenceQuote: graduationQuote,
        reasoning: `Candidate academic status confirmed as Graduate (${graduationQuote}). Satisfies "Final year or Graduate".`,
        confidence: 0.95,
        scoreContribution: 100,
      };
    }
    if (isFinalYear) {
      return {
        status: "MATCHED",
        evidenceQuote: finalYearQuote,
        reasoning: `Candidate academic status confirmed as Final Year student (${finalYearQuote}). Satisfies "Final year or Graduate".`,
        confidence: 0.95,
        scoreContribution: 100,
      };
    }
    if (isEarlyEnrolled) {
      return {
        status: "NOT_FOUND",
        evidenceQuote: earlyYearQuote,
        reasoning: `Candidate is currently enrolled (${earlyYearQuote}) but not in final year and has not yet graduated.`,
        confidence: 0.92,
        scoreContribution: 0,
      };
    }
    if (isIntermediateOnlyCompleted) {
      return {
        status: "NOT_FOUND",
        evidenceQuote: intermediateQuote,
        reasoning: `Candidate has completed ${intermediateQuote}, but has not reached final year or graduated from a university degree.`,
        confidence: 0.9,
        scoreContribution: 0,
      };
    }
    if (eduList.length > 0) {
      const sampleDegree = `${eduList[0].degree || "Degree"} from ${eduList[0].institution || "University"}`;
      return {
        status: "UNCLEAR",
        evidenceQuote: sampleDegree,
        reasoning: `Resume mentions "${sampleDegree}", but graduation date or year level is not specified to verify final year or graduate status.`,
        confidence: 0.7,
        scoreContribution: 40,
      };
    }
    return {
      status: "NOT_FOUND",
      evidenceQuote: "",
      reasoning: "No education or academic status evidence found matching Final Year or Graduate.",
      confidence: 0.9,
      scoreContribution: 0,
    };
  }

  // 2. "Final Year" only
  if (isFinalYearReqOnly) {
    if (isFinalYear) {
      return {
        status: "MATCHED",
        evidenceQuote: finalYearQuote,
        reasoning: `Candidate confirmed as Final Year student (${finalYearQuote}).`,
        confidence: 0.95,
        scoreContribution: 100,
      };
    }
    if (isGraduatedBachelorOrHigher) {
      return {
        status: "NOT_FOUND",
        evidenceQuote: graduationQuote,
        reasoning: `Candidate has already graduated (${graduationQuote}), which does not match the requirement for current Final Year students.`,
        confidence: 0.9,
        scoreContribution: 0,
      };
    }
    if (isEarlyEnrolled) {
      return {
        status: "NOT_FOUND",
        evidenceQuote: earlyYearQuote,
        reasoning: `Candidate is currently enrolled (${earlyYearQuote}), but not in final year.`,
        confidence: 0.92,
        scoreContribution: 0,
      };
    }
  }

  // 3. "Graduate" only
  if (isGraduateReqOnly) {
    if (isGraduatedBachelorOrHigher) {
      return {
        status: "MATCHED",
        evidenceQuote: graduationQuote,
        reasoning: `Candidate confirmed as University Graduate (${graduationQuote}).`,
        confidence: 0.95,
        scoreContribution: 100,
      };
    }
    if (isFinalYear || isEarlyEnrolled) {
      return {
        status: "NOT_FOUND",
        evidenceQuote: isFinalYear ? finalYearQuote : earlyYearQuote,
        reasoning: `Candidate is currently a student (${
          isFinalYear ? "Final Year" : detectedYearName
        }) and has not graduated.`,
        confidence: 0.92,
        scoreContribution: 0,
      };
    }
    if (isIntermediateOnlyCompleted) {
      return {
        status: "NOT_FOUND",
        evidenceQuote: intermediateQuote,
        reasoning: `Intermediate completion (${intermediateQuote}) does not qualify as a university degree Graduate.`,
        confidence: 0.95,
        scoreContribution: 0,
      };
    }
  }

  // 4. "Currently enrolled" / "Student"
  if (isEnrolledReqOnly) {
    if (isFinalYear || isEarlyEnrolled) {
      return {
        status: "MATCHED",
        evidenceQuote: isFinalYear ? finalYearQuote : earlyYearQuote,
        reasoning: `Candidate is currently enrolled (${
          isFinalYear ? finalYearQuote : earlyYearQuote
        }).`,
        confidence: 0.95,
        scoreContribution: 100,
      };
    }
    if (isGraduatedBachelorOrHigher) {
      return {
        status: "NOT_FOUND",
        evidenceQuote: graduationQuote,
        reasoning: "Candidate is a graduate and not currently enrolled as a student.",
        confidence: 0.9,
        scoreContribution: 0,
      };
    }
  }

  // Fallback
  if (eduList.length > 0) {
    const sampleDegree = `${eduList[0].degree || "Degree"} from ${eduList[0].institution || "University"}`;
    return {
      status: "UNCLEAR",
      evidenceQuote: sampleDegree,
      reasoning: `Resume mentions "${sampleDegree}", but academic status details are insufficient for "${title}".`,
      confidence: 0.7,
      scoreContribution: 40,
    };
  }

  return {
    status: "NOT_FOUND",
    evidenceQuote: "",
    reasoning: `No academic status evidence found matching "${title}".`,
    confidence: 0.9,
    scoreContribution: 0,
  };
}

/**
 * Deterministic matching engine that compares structured candidate data against job requirements.
 * CRITICAL RULE: Canonical JobRequirement type and category from MongoDB are the absolute source of truth.
 */
export function calculateDeterministicMatch(params: {
  candidate: CandidateResumeExtraction;
  requirements: Array<IJobRequirement | any>;
  scoringWeights?: IScoringWeights;
  screeningPolicy?: IScreeningPolicy;
}): MatchCalculationResult {
  const { candidate, requirements } = params;
  const weights: IScoringWeights = params.scoringWeights || {
    requiredSkillsWeight: 40,
    experienceWeight: 25,
    educationWeight: 15,
    preferredSkillsWeight: 10,
    otherWeight: 10,
  };

  const policy: IScreeningPolicy = params.screeningPolicy || {
    requiredSkillsMustMatch: true,
    minimumExperienceMustMatch: true,
    educationRequired: false,
    humanReviewBelowScore: 75,
  };

  // Build normalized skill lookup set for candidate
  const candidateSkillsSet = new Set<string>();
  const rawSkillsList = candidate.skills || [];
  rawSkillsList.forEach((s) => candidateSkillsSet.add(normalizeSkill(s)));
  (candidate.normalizedSkills || []).forEach((s) => candidateSkillsSet.add(normalizeSkill(s)));
  (candidate.experience || []).forEach((exp) => {
    (exp.skillsUsed || []).forEach((s) => candidateSkillsSet.add(normalizeSkill(s)));
  });

  const evaluatedRequirements: EvaluatedRequirement[] = [];

  let requiredSkillsTotal = 0;
  let requiredSkillsMatched = 0;
  let preferredSkillsTotal = 0;
  let preferredSkillsMatched = 0;

  let requiredExpYears = 0;
  const candidateExpYears = candidate.totalExperienceYears || 0;

  let otherTotal = 0;
  let otherMatched = 0;

  const humanReviewReasons: string[] = [];

  for (const req of requirements) {
    // CANONICAL FIELDS FROM MONGODB JOB REQUIREMENT
    const reqId = req._id ? req._id.toString() : (req.id || `req-${Math.random()}`);
    const title = req.title;
    const category: "REQUIRED" | "PREFERRED" | "OPTIONAL" = req.category || "REQUIRED";
    const type: "SKILL" | "EXPERIENCE" | "EDUCATION" | "ACADEMIC_STATUS" | "CERTIFICATION" | "CUSTOM" =
      req.type || "SKILL";
    const normKey = req.normalizedKey ? normalizeSkill(req.normalizedKey) : normalizeSkill(title);

    let status: MatchStatus = "NOT_FOUND";
    let reasoning = "";
    let evidenceQuote = "";
    let confidence = 0.9;
    let scoreContribution = 0;

    if (type === "ACADEMIC_STATUS") {
      const evalRes = evaluateAcademicStatusRequirement({
        title,
        normalizedKey: normKey,
        candidate,
      });
      status = evalRes.status;
      reasoning = evalRes.reasoning;
      evidenceQuote = evalRes.evidenceQuote;
      confidence = evalRes.confidence;
      scoreContribution = evalRes.scoreContribution;

      if (category === "REQUIRED" && status === "UNCLEAR") {
        humanReviewReasons.push(`Academic status is unclear from resume evidence: "${title}".`);
      }
    } else if (type === "SKILL") {
      const isRequired = category === "REQUIRED";
      if (isRequired) requiredSkillsTotal++;
      else if (category === "PREFERRED") preferredSkillsTotal++;

      // Check candidate skills profile
      const exactSkillFound = rawSkillsList.find(
        (s) => normalizeSkill(s) === normKey || normalizeSkill(s).includes(normKey) || normKey.includes(normalizeSkill(s))
      );

      const hasExactSkill = Boolean(exactSkillFound) || candidateSkillsSet.has(normKey);

      if (hasExactSkill) {
        status = "MATCHED";
        const matchedSkillName = exactSkillFound || title;
        evidenceQuote = `Skill verified in candidate profile: "${matchedSkillName}"`;
        reasoning = `Found direct match for skill "${title}" in candidate technical profile.`;
        confidence = 0.95;
        scoreContribution = 100;
        if (isRequired) requiredSkillsMatched++;
        else if (category === "PREFERRED") preferredSkillsMatched++;
      } else {
        // Look through experience descriptions for partial mentions
        const matchingExp = (candidate.experience || []).find((exp) =>
          (exp.description || "").toLowerCase().includes(normKey)
        );
        if (matchingExp) {
          status = "PARTIAL";
          const snippet = matchingExp.description.slice(0, 140).trim();
          evidenceQuote = `"${snippet}..." (${matchingExp.jobTitle || "Role"} at ${matchingExp.company || "Company"})`;
          reasoning = `Skill "${title}" mentioned in project/experience description at ${matchingExp.company}.`;
          confidence = 0.75;
          scoreContribution = 60;
          if (isRequired) requiredSkillsMatched += 0.6;
          else if (category === "PREFERRED") preferredSkillsMatched += 0.6;
        } else {
          status = "NOT_FOUND";
          evidenceQuote = "";
          reasoning = `No mention of "${title}" found in candidate resume.`;
          confidence = 0.9;
          scoreContribution = 0;
        }
      }
    } else if (type === "EXPERIENCE") {
      const minYears = req.minimumValue || 0;
      requiredExpYears = Math.max(requiredExpYears, minYears);

      if (candidateExpYears >= minYears) {
        status = "MATCHED";
        reasoning = `Candidate has ${candidateExpYears} years of experience, meeting or exceeding the required ${minYears} years.`;
        evidenceQuote = `Total detected experience: ${candidateExpYears} years across ${
          candidate.experience?.length || 0
        } roles.`;
        confidence = 0.95;
        scoreContribution = 100;
      } else if (candidateExpYears >= minYears * 0.7) {
        status = "PARTIAL";
        reasoning = `Candidate has ${candidateExpYears} years of experience, slightly below the requested ${minYears} years.`;
        evidenceQuote = `Total detected experience: ${candidateExpYears} years.`;
        confidence = 0.85;
        scoreContribution = Math.round((candidateExpYears / minYears) * 100);
        humanReviewReasons.push(
          `Experience shortfall: ${candidateExpYears} yrs detected vs ${minYears} yrs required.`
        );
      } else {
        status = "NOT_FOUND";
        reasoning = `Candidate has ${candidateExpYears} years of experience, below the required ${minYears} years.`;
        evidenceQuote = `Total detected experience: ${candidateExpYears} years.`;
        confidence = 0.9;
        scoreContribution = Math.round((candidateExpYears / minYears) * 100);
      }
    } else if (type === "EDUCATION") {
      const targetRank = getDegreeLevelAndRank(title).rank;
      const highestCandidate = candidate.highestDegree
        ? getDegreeLevelAndRank(candidate.highestDegree)
        : candidate.education && candidate.education[0]?.degree
        ? getDegreeLevelAndRank(candidate.education[0].degree)
        : { level: "UNKNOWN", rank: 0 };

      if (highestCandidate.rank >= targetRank && highestCandidate.rank > 0) {
        status = "MATCHED";
        const candidateDeg = candidate.education?.[0]?.degree || candidate.highestDegree || "Degree";
        const candidateInst = candidate.education?.[0]?.institution || "University";
        evidenceQuote = `${candidateDeg} from ${candidateInst}`;
        reasoning = `Candidate holds a qualifying degree (${candidateDeg}) satisfying the degree-level requirement.`;
        confidence = 0.92;
        scoreContribution = 100;
      } else if (candidate.education && candidate.education.length > 0) {
        status = "PARTIAL";
        const candidateDeg = candidate.education[0]?.degree || "Diploma";
        reasoning = `Candidate holds education credentials (${candidateDeg}) which may partially satisfy requirement.`;
        evidenceQuote = `${candidateDeg} from ${candidate.education[0]?.institution || "College"}`;
        confidence = 0.75;
        scoreContribution = 60;
      } else {
        status = "NOT_FOUND";
        evidenceQuote = "";
        reasoning = `No matching degree found for "${title}".`;
        confidence = 0.85;
        scoreContribution = 0;
      }
    } else {
      // CERTIFICATION or CUSTOM
      otherTotal++;
      const normTitle = normalizeSkill(title);
      const certFound = (candidate.certifications || []).find(
        (c) =>
          normalizeSkill(c.name).includes(normTitle) ||
          normTitle.includes(normalizeSkill(c.name))
      );

      if (certFound) {
        status = "MATCHED";
        otherMatched++;
        evidenceQuote = `Certification: ${certFound.name}${certFound.issuer ? ` by ${certFound.issuer}` : ""}`;
        reasoning = `Candidate holds verified certification matching "${title}".`;
        confidence = 0.95;
        scoreContribution = 100;
      } else {
        status = "NOT_FOUND";
        evidenceQuote = "";
        reasoning = `No certification or custom evidence found for "${title}".`;
        confidence = 0.85;
        scoreContribution = 0;
      }
    }

    // PUSH STRICT CANONICAL DATA
    evaluatedRequirements.push({
      jobRequirementId: reqId,
      requirementTitle: title,
      requirementCategory: category,
      requirementType: type,
      status,
      evidenceQuote,
      reasoning,
      confidence,
      scoreContribution,
    });
  }

  // Calculate Sub-Scores (0 - 100)
  const skillsScore =
    requiredSkillsTotal > 0
      ? Math.min(100, Math.round((requiredSkillsMatched / requiredSkillsTotal) * 100))
      : 100;

  const experienceScore =
    requiredExpYears > 0
      ? Math.min(100, Math.round((candidateExpYears / requiredExpYears) * 100))
      : 100;

  const educationReqs = evaluatedRequirements.filter((r) => r.requirementType === "EDUCATION" || r.requirementType === "ACADEMIC_STATUS");
  const educationScore =
    educationReqs.length > 0
      ? Math.round(
          educationReqs.reduce((acc, r) => acc + r.scoreContribution, 0) / educationReqs.length
        )
      : 100;

  const preferredSkillsScore =
    preferredSkillsTotal > 0
      ? Math.min(100, Math.round((preferredSkillsMatched / preferredSkillsTotal) * 100))
      : 100;

  const otherScore =
    otherTotal > 0
      ? Math.min(100, Math.round((otherMatched / otherTotal) * 100))
      : 100;

  // Calculate Overall Weighted Score
  const totalWeight =
    (weights.requiredSkillsWeight || 40) +
    (weights.experienceWeight || 25) +
    (weights.educationWeight || 15) +
    (weights.preferredSkillsWeight || 10) +
    (weights.otherWeight || 10);

  const weightedSum =
    skillsScore * (weights.requiredSkillsWeight || 40) +
    experienceScore * (weights.experienceWeight || 25) +
    educationScore * (weights.educationWeight || 15) +
    preferredSkillsScore * (weights.preferredSkillsWeight || 10) +
    otherScore * (weights.otherWeight || 10);

  const overallScore = Math.min(100, Math.max(0, Math.round(weightedSum / (totalWeight || 100))));

  // Evaluate Deterministic Screening Policy Gates
  let meetsPolicy = true;

  if (policy.requiredSkillsMustMatch && requiredSkillsTotal > 0) {
    const requiredSkillsMatchRatio = requiredSkillsMatched / requiredSkillsTotal;
    if (requiredSkillsMatchRatio < 0.5) {
      meetsPolicy = false;
      humanReviewReasons.push(
        `Candidate matched only ${requiredSkillsMatched}/${requiredSkillsTotal} required skills (< 50%).`
      );
    }
  }

  if (policy.minimumExperienceMustMatch && requiredExpYears > 0) {
    if (candidateExpYears < requiredExpYears * 0.7) {
      meetsPolicy = false;
      humanReviewReasons.push(
        `Experience shortfall (${candidateExpYears} yrs vs ${requiredExpYears} yrs required).`
      );
    }
  }

  if (policy.educationRequired && educationReqs.length > 0) {
    const hasUnmetRequiredEdu = educationReqs.some(
      (r) => r.requirementCategory === "REQUIRED" && r.status !== "MATCHED"
    );
    if (hasUnmetRequiredEdu) {
      meetsPolicy = false;
      humanReviewReasons.push("Candidate did not satisfy required degree or academic status.");
    }
  }

  // Determine Categorization
  let category: ScreeningCategory = "POSSIBLE_MATCH";

  if (!meetsPolicy || overallScore < 50) {
    category = "DOES_NOT_MEET_STATED_REQUIREMENTS";
  } else if (overallScore >= 80) {
    category = "STRONG_MATCH";
  } else {
    category = "POSSIBLE_MATCH";
  }

  // Determine Human Review Recommendation
  const humanReviewThreshold = policy.humanReviewBelowScore || 75;
  const humanReviewRecommended =
    overallScore < humanReviewThreshold || humanReviewReasons.length > 0;

  const scoreBreakdown: IScoreBreakdown = {
    skillsScore,
    experienceScore,
    educationScore,
    preferredSkillsScore,
    otherScore,
  };

  const summary = `Candidate scored ${overallScore}/100 (${category.replace("_", " ")}). Matched ${requiredSkillsMatched}/${requiredSkillsTotal} required skills, ${candidateExpYears} yrs experience (required: ${requiredExpYears} yrs).`;

  return {
    overallScore,
    category,
    summary,
    confidence: 0.92,
    humanReviewRecommended,
    humanReviewReasons,
    scoreBreakdown,
    matchedRequirements: evaluatedRequirements,
    matchedRequiredSkillsCount: Math.round(requiredSkillsMatched),
    totalRequiredSkillsCount: requiredSkillsTotal,
    matchedPreferredSkillsCount: Math.round(preferredSkillsMatched),
    totalPreferredSkillsCount: preferredSkillsTotal,
    detectedExperienceYears: candidateExpYears,
    requiredExperienceYears: requiredExpYears,
  };
}

export default calculateDeterministicMatch;
