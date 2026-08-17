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
  requirementType: "SKILL" | "EXPERIENCE" | "EDUCATION" | "CERTIFICATION" | "CUSTOM";
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

    if (type === "SKILL") {
      const isRequired = category === "REQUIRED";
      if (isRequired) requiredSkillsTotal++;
      else if (category === "PREFERRED") preferredSkillsTotal++;

      // Check candidate skills
      const hasExactSkill = candidateSkillsSet.has(normKey) ||
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
        evidenceQuote = `Total detected experience: ${candidateExpYears} years across ${candidate.experience?.length || 0} roles.`;
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
        reasoning = `Candidate holds a qualifying degree (${candidateDeg}) satisfying the requirement.`;
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
        (c) => normalizeSkill(c.name).includes(normTitle) || normTitle.includes(normalizeSkill(c.name))
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
