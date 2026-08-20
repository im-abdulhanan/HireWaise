/**
 * Requirement Normalizer & Taxonomy Engine
 * 
 * Provides comprehensive alias mapping, acronym expansions, education hierarchy rank,
 * and controlled semantic relationships for production-grade resume screening.
 */

export type MatchClassification =
  | "EXACT_MATCH"
  | "ALIAS_MATCH"
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
 * Standard Education Degree Ranks
 */
export const DEGREE_RANKS: Record<string, number> = {
  high_school: 1,
  intermediate: 2,
  diploma: 3,
  associate: 3,
  bachelor: 4,
  master: 5,
  phd: 6,
};

/**
 * Canonical taxonomy of Certifications, Safety & HSE Standards, Computer & IT Skills,
 * and Technical Programming Languages.
 */
const CANONICAL_TAXONOMY: Record<
  string,
  {
    type: "SKILL" | "EXPERIENCE" | "EDUCATION" | "ACADEMIC_STATUS" | "CERTIFICATION" | "CUSTOM";
    aliases: string[];
    relatedTerms: string[];
    degreeRank?: number;
  }
> = {
  // --- HSE, SAFETY & INDUSTRIAL CERTIFICATIONS ---
  nebosh: {
    type: "CERTIFICATION",
    aliases: [
      "nebosh",
      "national examination board in occupational safety and health",
      "national examination board in occupational safety & health",
      "nebosh igc",
      "nebosh international general certificate",
      "nebosh hsw",
      "nebosh certificate",
      "nebosh diploma",
      "the national examination board in occupational safety & health",
      "the national examination board in occupational safety and health",
    ],
    relatedTerms: ["hse", "occupational safety", "health & safety", "iosh", "osha"],
  },
  osha: {
    type: "CERTIFICATION",
    aliases: [
      "osha",
      "occupational safety and health administration",
      "occupational safety & health administration",
      "occupational safety and health",
      "osha 30",
      "osha 30 hours",
      "osha 30-hour",
      "osha 10",
      "osha 10 hours",
      "osha certified",
      "osha certification",
      "osha general industry",
      "osha construction",
    ],
    relatedTerms: ["hse", "safety officer", "health & safety", "nebosh", "iosh"],
  },
  iosh: {
    type: "CERTIFICATION",
    aliases: [
      "iosh",
      "institution of occupational safety and health",
      "institution of occupational safety & health",
      "iosh managing safely",
      "iosh working safely",
      "managing safely",
      "working safely",
    ],
    relatedTerms: ["hse", "safety officer", "nebosh", "osha"],
  },
  hse: {
    type: "SKILL",
    aliases: [
      "hse",
      "ehs",
      "she",
      "health safety environmental",
      "health safety environment",
      "health, safety and environment",
      "health, safety & environment",
      "health safety and environmental engineering",
      "health safety & environmental engineering",
      "environment health safety",
      "environmental health and safety",
      "occupational health and safety",
      "occupational health & safety",
      "health & safety",
      "health and safety",
      "safety officer",
      "hse officer",
      "hse supervisor",
      "hse engineer",
      "safety engineer",
    ],
    relatedTerms: ["osha", "nebosh", "iosh", "hazard identification", "risk assessment", "incident investigation", "safety audit", "first aid"],
  },
  "safety and health": {
    type: "SKILL",
    aliases: [
      "safety and health",
      "safety & health",
      "health and safety",
      "health & safety",
      "occupational safety and health",
      "occupational safety & health",
      "occupational health and safety",
      "occupational health & safety",
      "occupational safety",
      "occupational health",
      "workplace safety",
      "industrial safety",
    ],
    relatedTerms: [
      "hse",
      "ehs",
      "osha",
      "nebosh",
      "iosh",
      "safety officer",
      "safety inspection",
      "risk assessment",
      "hazard identification",
    ],
  },
  iso: {
    type: "CERTIFICATION",
    aliases: [
      "iso 45001",
      "iso 14001",
      "iso 9001",
      "iso lead auditor",
      "iso internal auditor",
      "ohsas 18001",
    ],
    relatedTerms: ["hse", "safety audit", "quality management"],
  },
  "first aid": {
    type: "CERTIFICATION",
    aliases: ["first aid", "cpr", "basic life support", "bls", "emergency first aid"],
    relatedTerms: ["safety officer", "hse"],
  },

  // --- COMPUTER, OFFICE & DATA SKILLS ---
  "computer skills": {
    type: "SKILL",
    aliases: [
      "computer skills",
      "computer literacy",
      "computer literate",
      "basic computer skills",
      "it skills",
      "computer proficiency",
      "computer applications",
      "information technology",
    ],
    relatedTerms: [
      "computer operator",
      "data entry",
      "ms office",
      "microsoft office",
      "microsoft word",
      "microsoft excel",
      "ms excel",
      "ms word",
      "excel",
      "word",
      "powerpoint",
      "typing",
      "data entry operator",
    ],
  },
  "computer operator": {
    type: "SKILL",
    aliases: [
      "computer operator",
      "computer operation",
      "computer operator / data entry",
      "computer operator & data entry",
      "it operator",
    ],
    relatedTerms: ["data entry", "ms office", "typing", "computer skills"],
  },
  "data entry": {
    type: "SKILL",
    aliases: [
      "data entry",
      "data entry operator",
      "data input",
      "data processing",
      "data entry clerk",
      "data entry specialist",
      "typing",
    ],
    relatedTerms: ["computer operator", "ms excel", "excel", "computer skills"],
  },
  "ms office": {
    type: "SKILL",
    aliases: [
      "ms office",
      "microsoft office",
      "ms-office",
      "microsoft office suite",
      "ms office suite",
      "office 365",
      "microsoft 365",
      "ms word",
      "microsoft word",
      "ms excel",
      "microsoft excel",
      "excel",
      "word",
      "powerpoint",
      "ms powerpoint",
      "microsoft powerpoint",
    ],
    relatedTerms: ["computer skills", "data entry", "computer operator"],
  },

  // --- TECHNICAL & SOFTWARE ENGINEERING SKILLS ---
  react: {
    type: "SKILL",
    aliases: ["react", "react.js", "reactjs", "react native", "react-native"],
    relatedTerms: ["frontend", "javascript", "typescript", "web development", "next.js", "redux"],
  },
  "next.js": {
    type: "SKILL",
    aliases: ["next.js", "nextjs", "next", "next js"],
    relatedTerms: ["react", "react.js", "frontend", "full stack", "ssr", "typescript"],
  },
  "node.js": {
    type: "SKILL",
    aliases: ["node.js", "nodejs", "node", "node js"],
    relatedTerms: ["express", "express.js", "backend", "javascript", "typescript", "nest.js"],
  },
  typescript: {
    type: "SKILL",
    aliases: ["typescript", "ts"],
    relatedTerms: ["javascript", "frontend", "backend", "react", "node.js"],
  },
  javascript: {
    type: "SKILL",
    aliases: ["javascript", "js", "ecmascript", "es6"],
    relatedTerms: ["typescript", "frontend", "web development"],
  },
  python: {
    type: "SKILL",
    aliases: ["python", "python3", "py", "python 3"],
    relatedTerms: ["django", "flask", "fastapi", "pandas", "numpy", "data engineering", "ai"],
  },
  go: {
    type: "SKILL",
    aliases: ["golang", "go programming", "go lang", "go language"],
    relatedTerms: ["backend", "microservices", "docker", "kubernetes"],
  },
  sql: {
    type: "SKILL",
    aliases: [
      "sql",
      "postgresql",
      "postgres",
      "mysql",
      "sqlite",
      "mssql",
      "microsoft sql server",
      "oracle sql",
      "relational database",
      "rdbms",
    ],
    relatedTerms: ["database", "prisma", "sequelize", "typeorm", "backend"],
  },
  mongodb: {
    type: "SKILL",
    aliases: ["mongodb", "mongo", "nosql", "document database", "mongoose"],
    relatedTerms: ["database", "backend", "node.js"],
  },
  aws: {
    type: "SKILL",
    aliases: [
      "aws",
      "amazon web services",
      "amazon cloud",
      "aws cloud",
      "ec2",
      "s3",
      "lambda",
      "aws lambda",
    ],
    relatedTerms: ["cloud", "devops", "gcp", "azure", "serverless"],
  },
  docker: {
    type: "SKILL",
    aliases: ["docker", "docker container", "docker containers", "containerization"],
    relatedTerms: ["kubernetes", "k8s", "devops", "ci/cd"],
  },
  kubernetes: {
    type: "SKILL",
    aliases: ["kubernetes", "k8s"],
    relatedTerms: ["docker", "devops", "helm", "cloud"],
  },
  git: {
    type: "SKILL",
    aliases: ["git", "github", "gitlab", "bitbucket", "version control"],
    relatedTerms: ["devops", "ci/cd"],
  },
  "ci/cd": {
    type: "SKILL",
    aliases: ["ci/cd", "cicd", "continuous integration", "continuous deployment", "github actions", "jenkins"],
    relatedTerms: ["devops", "git", "docker"],
  },

  // --- EDUCATION & QUALIFICATIONS ---
  dae: {
    type: "EDUCATION",
    aliases: [
      "dae",
      "diploma of associate engineering",
      "diploma of associate engineer",
      "diploma in associate engineering",
      "diploma in associate engineer",
      "associate engineering",
      "associate engineer",
      "3 years diploma",
      "3-year diploma",
      "3 year diploma",
      "dae mechanical",
      "dae mechanical engineering",
      "dae electrical",
      "dae civil",
      "dae chemical",
      "dae electronics",
      "polytechnic diploma",
    ],
    relatedTerms: ["diploma", "technical education", "associate engineer"],
    degreeRank: DEGREE_RANKS.diploma,
  },
  diploma: {
    type: "EDUCATION",
    aliases: [
      "diploma",
      "polytechnic diploma",
      "2-year diploma",
      "3-year diploma",
      "postgraduate diploma",
      "pg diploma",
      "national diploma",
    ],
    relatedTerms: ["dae", "associate degree"],
    degreeRank: DEGREE_RANKS.diploma,
  },
  bachelor: {
    type: "EDUCATION",
    aliases: [
      "bachelor",
      "bachelors",
      "bachelor's",
      "bachelor's degree",
      "bachelors degree",
      "bs",
      "b.s",
      "bsc",
      "b.sc",
      "b.tech",
      "btech",
      "b.e",
      "be",
      "b.eng",
      "beng",
      "bba",
      "bcs",
      "b.cs",
      "bcom",
      "b.com",
      "ba",
      "b.a",
      "undergraduate degree",
      "university graduate",
      "4-year degree",
      "four year degree",
    ],
    relatedTerms: ["university degree", "undergraduate", "graduate"],
    degreeRank: DEGREE_RANKS.bachelor,
  },
  master: {
    type: "EDUCATION",
    aliases: [
      "master",
      "masters",
      "master's",
      "master's degree",
      "masters degree",
      "ms",
      "m.s",
      "msc",
      "m.sc",
      "mphil",
      "m.phil",
      "mba",
      "m.ba",
      "m.tech",
      "mtech",
      "m.e",
      "meng",
      "postgraduate degree",
      "graduate degree",
    ],
    relatedTerms: ["postgraduate", "university degree"],
    degreeRank: DEGREE_RANKS.master,
  },
  phd: {
    type: "EDUCATION",
    aliases: [
      "phd",
      "ph.d",
      "doctorate",
      "doctor of philosophy",
      "doctoral degree",
    ],
    relatedTerms: ["doctorate", "postgraduate"],
    degreeRank: DEGREE_RANKS.phd,
  },
  intermediate: {
    type: "EDUCATION",
    aliases: [
      "intermediate",
      "fsc",
      "f.sc",
      "fsc pre-engineering",
      "fsc pre-medical",
      "ics",
      "i.cs",
      "fa",
      "f.a",
      "icom",
      "i.com",
      "hssc",
      "higher secondary school certificate",
      "higher secondary",
      "a level",
      "a-level",
      "a levels",
      "12th grade",
      "12th class",
      "senior secondary",
    ],
    relatedTerms: ["high school", "college"],
    degreeRank: DEGREE_RANKS.intermediate,
  },
  "high school": {
    type: "EDUCATION",
    aliases: [
      "high school",
      "matric",
      "matriculation",
      "ssc",
      "secondary school certificate",
      "o level",
      "o-level",
      "o levels",
      "10th grade",
      "10th class",
    ],
    relatedTerms: ["secondary"],
    degreeRank: DEGREE_RANKS.high_school,
  },
};

/**
 * Clean and normalize a requirement or skill title string into an alphanumeric key.
 */
export function cleanKey(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s.+/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  // If phrase contains spaces, allow flexible whitespace / punctuation
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
    lower.includes("high school")
  ) {
    type = "EDUCATION";
  } else if (
    lower.includes("nebosh") ||
    lower.includes("osha") ||
    lower.includes("iosh") ||
    lower.includes("certified") ||
    lower.includes("certification") ||
    lower.includes("license") ||
    lower.includes("pmp")
  ) {
    type = "CERTIFICATION";
  }

  // Check taxonomy for match
  let matchedTaxonomyKey = "";
  for (const [taxKey, data] of Object.entries(CANONICAL_TAXONOMY)) {
    if (cleaned === taxKey || data.aliases.some((a) => cleanKey(a) === cleaned)) {
      matchedTaxonomyKey = taxKey;
      break;
    }
  }

  // If no direct key match, check substring/partial keyword matches in taxonomy
  if (!matchedTaxonomyKey) {
    for (const [taxKey, data] of Object.entries(CANONICAL_TAXONOMY)) {
      if (
        cleaned.includes(taxKey) ||
        data.aliases.some((a) => cleaned.includes(cleanKey(a)) || cleanKey(a).includes(cleaned))
      ) {
        matchedTaxonomyKey = taxKey;
        break;
      }
    }
  }

  const aliasesSet = new Set<string>();
  const relatedSet = new Set<string>();

  // Add raw title variations
  aliasesSet.add(rawTitle.trim());
  aliasesSet.add(cleaned);

  let requiredDegreeRank: number | undefined;
  let requiredDegreeLevel: string | undefined;
  let academicStatusRule: NormalizedRequirement["academicStatusRule"];

  if (matchedTaxonomyKey) {
    const tax = CANONICAL_TAXONOMY[matchedTaxonomyKey];
    tax.aliases.forEach((a) => aliasesSet.add(a));
    tax.relatedTerms.forEach((r) => relatedSet.add(r));
    if (tax.degreeRank) {
      requiredDegreeRank = tax.degreeRank;
      requiredDegreeLevel = matchedTaxonomyKey.toUpperCase();
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
        // Fallback for tricky characters
      }
    }
  });

  return {
    originalTitle: rawTitle,
    normalizedKey: matchedTaxonomyKey || cleaned,
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

  // 3. Controlled Semantic match
  for (const term of normReq.relatedTerms) {
    const termClean = cleanKey(term);
    if (snippetClean.includes(termClean) || buildWordBoundaryRegex(term).test(candidateSnippet)) {
      return "SEMANTIC_MATCH";
    }
  }

  // 4. Token overlap partial match
  const reqTokens = reqClean.split(" ").filter((t) => t.length > 2);
  const matchedTokens = reqTokens.filter((t) => snippetClean.includes(t));
  if (reqTokens.length > 0 && matchedTokens.length / reqTokens.length >= 0.5) {
    return "PARTIAL_MATCH";
  }

  return "NO_MATCH";
}
