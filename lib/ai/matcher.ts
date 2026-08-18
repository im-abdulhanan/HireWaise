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
const DEGREE_RANKS: Record<string, number> = {
  high_school: 1,
  associate: 2,
  bachelor: 3,
  master: 4,
  phd: 5,
  doctorate: 5,
};

function getDegreeRank(degreeText: string): number {
  if (!degreeText) return 0;
  const lower = degreeText.toLowerCase();
  if (lower.includes("phd") || lower.includes("doctor")) return DEGREE_RANKS.phd;
  if (lower.includes("master") || lower.includes("ms") || lower.includes("mba")) return DEGREE_RANKS.master;
  if (lower.includes("bachelor") || lower.includes("bs") || lower.includes("ba") || lower.includes("bsc") || lower.includes("b.e") || lower.includes("b.tech")) return DEGREE_RANKS.bachelor;
  if (lower.includes("associate")) return DEGREE_RANKS.associate;
  if (lower.includes("high school")) return DEGREE_RANKS.high_school;
  return 2; // general college/diploma default
}

/**
 * Evaluates academic status requirements such as:
 * - "Final year or Graduate"
 * - "Final year"
 * - "Graduate"
 * - "Currently enrolled"
 * - "Not currently enrolled"
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
    (target.includes("final year") || target.includes("final_year") || target.includes("senior"));

  const isGraduateReqOnly =
    !isFinalYearOrGradReq &&
    (target.includes("graduate") || target.includes("graduated") || target.includes("degree completed"));

  const isEnrolledReqOnly =
    target.includes("currently enrolled") || target.includes("current student");

  const eduList = candidate.education || [];
  const candidateText = [
    candidate.summary || "",
    ...eduList.map(
      (e) =>
        `${e.degree || ""} ${e.institution || ""} ${e.fieldOfStudy || ""} ${e.graduationYear || ""} ${e.academicYearLevel || ""} ${e.academicStatus || ""}`
    ),
  ]
    .join(" ")
    .toLowerCase();

  // 1. Detect Explicit Graduation
  let isGraduated = false;
  let graduationQuote = "";

  for (const edu of eduList) {
    if (edu.academicStatus === "GRADUATED" || edu.isCompleted === true) {
      isGraduated = true;
      graduationQuote = `${edu.degree || "Degree"} from ${edu.institution || "University"}${
        edu.graduationYear ? ` (Graduated ${edu.graduationYear})` : " (Graduated)"
      }`;
      break;
    }
    const degLower = (edu.degree || "").toLowerCase();
    const gradYearNum = parseInt(String(edu.graduationYear || "").replace(/\D/g, ""), 10);
    const currentYear = new Date().getFullYear();

    if (
      degLower.includes("graduat") ||
      degLower.includes("completed") ||
      degLower.includes("passed") ||
      (edu.academicYearLevel && edu.academicYearLevel.toLowerCase().includes("graduat"))
    ) {
      isGraduated = true;
      graduationQuote = `${edu.degree} from ${edu.institution}`;
      break;
    }

    if (
      gradYearNum &&
      gradYearNum <= currentYear &&
      !edu.isCurrent &&
      !degLower.includes("expected")
    ) {
      isGraduated = true;
      graduationQuote = `${edu.degree || "Degree"} from ${edu.institution || "University"} (Graduated ${gradYearNum})`;
      break;
    }
  }

  // 2. Detect Final Year
  let isFinalYear = false;
  let finalYearQuote = "";

  for (const edu of eduList) {
    if (edu.academicStatus === "FINAL_YEAR") {
      isFinalYear = true;
      finalYearQuote = `${edu.degree || "Degree"} from ${edu.institution || "University"} (Final Year)`;
      break;
    }
    const degLower = (edu.degree || "").toLowerCase();
    const levelLower = (edu.academicYearLevel || "").toLowerCase();
    if (
      degLower.includes("final year") ||
      degLower.includes("4th year") ||
      degLower.includes("fourth year") ||
      degLower.includes("senior year") ||
      levelLower.includes("final") ||
      levelLower.includes("4th")
    ) {
      isFinalYear = true;
      finalYearQuote = `${edu.degree || "Degree"} from ${edu.institution || "University"} (${
        edu.academicYearLevel || "Final Year"
      })`;
      break;
    }
  }

  if (
    !isFinalYear &&
    (candidateText.includes("final year") || candidateText.includes("4th year"))
  ) {
    isFinalYear = true;
    finalYearQuote = "Resume confirms Final Year status";
  }

  // 3. Detect Non-Final Enrolled (1st, 2nd, 3rd year)
  let isEarlyEnrolled = false;
  let earlyYearQuote = "";
  let detectedYearName = "";

  for (const edu of eduList) {
    const degLower = (edu.degree || "").toLowerCase();
    const levelLower = (edu.academicYearLevel || "").toLowerCase();
    const fullEduStr = `${degLower} ${levelLower}`;

    if (
      fullEduStr.includes("1st year") ||
      fullEduStr.includes("first year") ||
      fullEduStr.includes("freshman")
    ) {
      isEarlyEnrolled = true;
      detectedYearName = "1st Year";
      earlyYearQuote = `${edu.degree || "Degree"} — 1st Year`;
      break;
    } else if (
      fullEduStr.includes("2nd year") ||
      fullEduStr.includes("second year") ||
      fullEduStr.includes("sophomore")
    ) {
      isEarlyEnrolled = true;
      detectedYearName = "2nd Year";
      earlyYearQuote = `${edu.degree || "Degree"} — 2nd Year`;
      break;
    } else if (
      fullEduStr.includes("3rd year") ||
      fullEduStr.includes("third year") ||
      fullEduStr.includes("junior")
    ) {
      isEarlyEnrolled = true;
      detectedYearName = "3rd Year";
      earlyYearQuote = `${edu.degree || "Degree"} — 3rd Year`;
      break;
    }
  }

  if (!isEarlyEnrolled) {
    if (candidateText.includes("1st year") || candidateText.includes("first year")) {
      isEarlyEnrolled = true;
      detectedYearName = "1st Year";
      earlyYearQuote = "1st Year student";
    } else if (candidateText.includes("2nd year") || candidateText.includes("second year")) {
      isEarlyEnrolled = true;
      detectedYearName = "2nd Year";
      earlyYearQuote = "2nd Year student";
    } else if (candidateText.includes("3rd year") || candidateText.includes("third year")) {
      isEarlyEnrolled = true;
      detectedYearName = "3rd Year";
      earlyYearQuote = "3rd Year student";
    }
  }

  // 4. Degree Mentioned But Unclear Status
  const hasDegreeMentioned =
    eduList.length > 0 && Boolean(eduList[0].degree || eduList[0].institution);
  const degreeQuote = hasDegreeMentioned
    ? `${eduList[0].degree || "Degree"}${
        eduList[0].institution ? ` from ${eduList[0].institution}` : ""
      }`
    : "";

  // EVALUATE AGAINST REQUIREMENT TARGET
  if (isFinalYearOrGradReq) {
    if (isGraduated) {
      return {
        status: "MATCHED",
        evidenceQuote: graduationQuote,
        reasoning: `Candidate academic status confirmed as Graduate (${graduationQuote}).`,
        confidence: 0.95,
        scoreContribution: 100,
      };
    }
    if (isFinalYear) {
      return {
        status: "MATCHED",
        evidenceQuote: finalYearQuote,
        reasoning: `Candidate academic status confirmed as Final Year (${finalYearQuote}).`,
        confidence: 0.95,
        scoreContribution: 100,
      };
    }
    if (isEarlyEnrolled) {
      return {
        status: "NOT_FOUND",
        evidenceQuote: earlyYearQuote,
        reasoning: `Candidate is in ${detectedYearName}, which does not meet the requirement of Final Year or Graduate.`,
        confidence: 0.92,
        scoreContribution: 0,
      };
    }
    if (hasDegreeMentioned) {
      return {
        status: "UNCLEAR",
        evidenceQuote: degreeQuote,
        reasoning: `Resume lists "${degreeQuote}", but does not provide completion date, year level, or graduation status to verify if candidate is in final year or already graduated.`,
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

  if (isFinalYearReqOnly) {
    if (isFinalYear) {
      return {
        status: "MATCHED",
        evidenceQuote: finalYearQuote,
        reasoning: `Candidate academic status confirmed as Final Year (${finalYearQuote}).`,
        confidence: 0.95,
        scoreContribution: 100,
      };
    }
    if (isGraduated) {
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
        reasoning: `Candidate is in ${detectedYearName}, not final year.`,
        confidence: 0.92,
        scoreContribution: 0,
      };
    }
    if (hasDegreeMentioned) {
      return {
        status: "UNCLEAR",
        evidenceQuote: degreeQuote,
        reasoning: `Resume lists "${degreeQuote}" without specifying final year status.`,
        confidence: 0.7,
        scoreContribution: 40,
      };
    }
  }

  if (isGraduateReqOnly) {
    if (isGraduated) {
      return {
        status: "MATCHED",
        evidenceQuote: graduationQuote,
        reasoning: `Candidate confirmed as Graduate (${graduationQuote}).`,
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
    if (hasDegreeMentioned) {
      return {
        status: "UNCLEAR",
        evidenceQuote: degreeQuote,
        reasoning: `Resume mentions "${degreeQuote}" without explicit completion date or graduation confirmation.`,
        confidence: 0.7,
        scoreContribution: 40,
      };
    }
  }

  if (isEnrolledReqOnly) {
    if (isFinalYear || isEarlyEnrolled) {
      return {
        status: "MATCHED",
        evidenceQuote: isFinalYear ? finalYearQuote : earlyYearQuote,
        reasoning: `Candidate is currently enrolled (${
          isFinalYear ? "Final Year" : detectedYearName
        }).`,
        confidence: 0.95,
        scoreContribution: 100,
      };
    }
    if (isGraduated) {
      return {
        status: "NOT_FOUND",
        evidenceQuote: graduationQuote,
        reasoning: "Candidate is a graduate, not currently enrolled.",
        confidence: 0.9,
        scoreContribution: 0,
      };
    }
  }

  // Fallback for general academic status
  if (hasDegreeMentioned) {
    return {
      status: "UNCLEAR",
      evidenceQuote: degreeQuote,
      reasoning: `Resume mentions "${degreeQuote}", but academic status details are insufficient for "${title}".`,
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
  (candidate.skills || []).forEach((s) => candidateSkillsSet.add(normalizeSkill(s)));
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

  let requiredEducationPresent = false;
  let educationMatched = false;

  let otherTotal = 0;
  let otherMatched = 0;

  const humanReviewReasons: string[] = [];

  for (const req of requirements) {
    const title = req.title;
    const category = req.category;
    const type = req.type;
    const normKey = req.normalizedKey ? normalizeSkill(req.normalizedKey) : normalizeSkill(title);
    const reqId = req._id ? req._id.toString() : (req.id || `req-${Math.random()}`);

    let status: MatchStatus = "NOT_FOUND";
    let reasoning = "";
    let evidenceQuote = "";
    let confidence = 0.9;
    let scoreContribution = 0;

    // Check if this requirement is an Academic Status requirement (either by type or title keywords)
    const isAcademicStatusType =
      type === "ACADEMIC_STATUS" ||
      (type === "EDUCATION" &&
        (title.toLowerCase().includes("final year") ||
          title.toLowerCase().includes("graduate") ||
          title.toLowerCase().includes("enrolled") ||
          title.toLowerCase().includes("student") ||
          normKey.includes("final_year") ||
          normKey.includes("academic_status")));

    if (isAcademicStatusType) {
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

      if (category === "REQUIRED") {
        requiredEducationPresent = true;
        if (status === "MATCHED") {
          educationMatched = true;
        } else if (status === "UNCLEAR") {
          humanReviewReasons.push(
            `Academic status is unclear from resume evidence: "${title}".`
          );
        }
      }
    } else if (type === "SKILL") {
      const isRequired = category === "REQUIRED";
      if (isRequired) requiredSkillsTotal++;
      else if (category === "PREFERRED") preferredSkillsTotal++;

      // Check candidate skills
      const hasExactSkill =
        candidateSkillsSet.has(normKey) ||
        Array.from(candidateSkillsSet).some((s) => s.includes(normKey) || normKey.includes(s));

      if (hasExactSkill) {
        status = "MATCHED";
        reasoning = `Found direct match for skill "${title}" in candidate skills and experience profile.`;
        confidence = 0.95;
        scoreContribution = 100;
        if (isRequired) requiredSkillsMatched++;
        else if (category === "PREFERRED") preferredSkillsMatched++;
      } else {
        // Look through experience descriptions for partial mentions
        const matchingExp = candidate.experience.find((exp) =>
          exp.description.toLowerCase().includes(normKey)
        );
        if (matchingExp) {
          status = "PARTIAL";
          evidenceQuote = matchingExp.description.slice(0, 150);
          reasoning = `Skill "${title}" mentioned in project/experience description at ${matchingExp.company}.`;
          confidence = 0.75;
          scoreContribution = 60;
          if (isRequired) requiredSkillsMatched += 0.6;
          else if (category === "PREFERRED") preferredSkillsMatched += 0.6;
        } else {
          status = "NOT_FOUND";
          reasoning = `No explicit mention of "${title}" found in candidate resume.`;
          confidence = 0.9;
          scoreContribution = 0;
        }
      }
    } else if (type === "EXPERIENCE") {
      const minYears = req.minimumValue || 0;
      requiredExpYears = Math.max(requiredExpYears, minYears);

      if (candidateExpYears >= minYears) {
        status = "MATCHED";
        reasoning = `Candidate has ${candidateExpYears} years of experience, exceeding the required ${minYears} years.`;
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
        confidence = 0.9;
        scoreContribution = Math.round((candidateExpYears / minYears) * 100);
      }
    } else if (type === "EDUCATION") {
      requiredEducationPresent = true;
      const targetRank = getDegreeRank(title);
      const candidateHighestRank = getDegreeRank(
        candidate.highestDegree ||
          (candidate.education && candidate.education[0]?.degree) ||
          ""
      );

      if (candidateHighestRank >= targetRank && candidateHighestRank > 0) {
        status = "MATCHED";
        educationMatched = true;
        const candidateDeg = candidate.education[0]?.degree || candidate.highestDegree || "Degree";
        const candidateInst = candidate.education[0]?.institution || "University";
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
        reasoning = `No matching degree found for "${title}".`;
        confidence = 0.85;
        scoreContribution = 0;
      }
    } else {
      // CERTIFICATION or CUSTOM
      otherTotal++;
      const normTitle = normalizeSkill(title);
      const certFound = (candidate.certifications || []).some(
        (c) =>
          normalizeSkill(c.name).includes(normTitle) ||
          normTitle.includes(normalizeSkill(c.name))
      );

      if (certFound) {
        status = "MATCHED";
        otherMatched++;
        reasoning = `Candidate holds verified certification/qualification matching "${title}".`;
        confidence = 0.95;
        scoreContribution = 100;
      } else {
        status = "NOT_FOUND";
        reasoning = `No evidence found for "${title}".`;
        confidence = 0.85;
        scoreContribution = 0;
      }
    }

    evaluatedRequirements.push({
      jobRequirementId: reqId,
      requirementTitle: title,
      requirementCategory: category,
      requirementType: isAcademicStatusType ? "ACADEMIC_STATUS" : type,
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

  const educationScore = requiredEducationPresent
    ? educationMatched
      ? 100
      : candidate.education?.length > 0
      ? 60
      : 0
    : 100;

  const preferredSkillsScore =
    preferredSkillsTotal > 0
      ? Math.min(100, Math.round((preferredSkillsMatched / preferredSkillsTotal) * 100))
      : 100;

  const otherScore =
    otherTotal > 0 ? Math.min(100, Math.round((otherMatched / otherTotal) * 100)) : 100;

  // Calculate Weighted Overall Score
  const totalWeight =
    weights.requiredSkillsWeight +
    weights.experienceWeight +
    weights.educationWeight +
    weights.preferredSkillsWeight +
    weights.otherWeight;

  const weightedSum =
    skillsScore * weights.requiredSkillsWeight +
    experienceScore * weights.experienceWeight +
    educationScore * weights.educationWeight +
    preferredSkillsScore * weights.preferredSkillsWeight +
    otherScore * weights.otherWeight;

  const overallScore = Math.min(100, Math.max(0, Math.round(weightedSum / (totalWeight || 100))));

  // Evaluate Screening Policy & Category
  let category: ScreeningCategory = "POSSIBLE_MATCH";
  let humanReviewRecommended = false;

  const allRequiredSkillsPassed = requiredSkillsTotal === 0 || requiredSkillsMatched >= requiredSkillsTotal * 0.85;
  const experiencePassed = requiredExpYears === 0 || candidateExpYears >= requiredExpYears;

  if (policy.requiredSkillsMustMatch && !allRequiredSkillsPassed) {
    if (requiredSkillsMatched < requiredSkillsTotal * 0.5) {
      category = "DOES_NOT_MEET_STATED_REQUIREMENTS";
    } else {
      category = "POSSIBLE_MATCH";
      humanReviewReasons.push("Candidate is missing one or more required skills.");
    }
  } else if (policy.minimumExperienceMustMatch && candidateExpYears < requiredExpYears * 0.7) {
    category = "DOES_NOT_MEET_STATED_REQUIREMENTS";
  } else if (overallScore >= 80 && allRequiredSkillsPassed && experiencePassed) {
    category = "STRONG_MATCH";
  } else if (overallScore >= 55) {
    category = "POSSIBLE_MATCH";
  } else {
    category = "DOES_NOT_MEET_STATED_REQUIREMENTS";
  }

  if (overallScore < policy.humanReviewBelowScore && category === "POSSIBLE_MATCH") {
    humanReviewRecommended = true;
    humanReviewReasons.push(`Score (${overallScore}) is below human review threshold (${policy.humanReviewBelowScore}).`);
  }

  let summary = "";
  if (category === "STRONG_MATCH") {
    summary = `Strong match with a score of ${overallScore}/100. Meets ${Math.round(requiredSkillsMatched)}/${requiredSkillsTotal} required skills and holds ${candidateExpYears} yrs experience (required: ${requiredExpYears} yrs).`;
  } else if (category === "POSSIBLE_MATCH") {
    summary = `Possible match with a score of ${overallScore}/100. Meets ${Math.round(requiredSkillsMatched)}/${requiredSkillsTotal} required skills. Human review recommended.`;
  } else {
    summary = `Does not meet stated requirements (Score: ${overallScore}/100). Meets ${Math.round(requiredSkillsMatched)}/${requiredSkillsTotal} required skills and ${candidateExpYears} yrs experience.`;
  }

  return {
    overallScore,
    category,
    summary,
    confidence: 0.9,
    humanReviewRecommended,
    humanReviewReasons,
    scoreBreakdown: {
      skillsScore,
      experienceScore,
      educationScore,
      preferredSkillsScore,
      otherScore,
    },
    matchedRequirements: evaluatedRequirements,
    matchedRequiredSkillsCount: Math.round(requiredSkillsMatched),
    totalRequiredSkillsCount: requiredSkillsTotal,
    matchedPreferredSkillsCount: Math.round(preferredSkillsMatched),
    totalPreferredSkillsCount: preferredSkillsTotal,
    detectedExperienceYears: candidateExpYears,
    requiredExperienceYears: requiredExpYears,
  };
}
