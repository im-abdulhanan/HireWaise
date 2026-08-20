/**
 * Matcher & Taxonomy Engine Test Suite
 */

import {
  normalizeRequirement,
  classifyMatch,
  DEGREE_RANKS,
} from "../lib/ai/requirement-normalizer";
import {
  matchRequirementAgainstResume,
  calculateMergedExperienceYears,
} from "../lib/ai/evidence-matcher";
import { calculateDeterministicMatch } from "../lib/ai/matcher";
import { CandidateResumeExtraction } from "../lib/ai/schemas";

async function runMatcherUnitTests() {
  console.log("\n=======================================================");
  console.log("RUNNING MATCHER & TAXONOMY UNIT TESTS");
  console.log("=======================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASSED] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAILED] ${testName}: ${detail || "Condition not met"}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // 1. Taxonomy & Normalization Tests
  const reactNorm = normalizeRequirement("React.js");
  assert(reactNorm.aliases.includes("react"), "React.js aliases include react");

  const nextNorm = normalizeRequirement("NextJS");
  assert(nextNorm.aliases.includes("next.js"), "NextJS aliases include next.js");

  const nodeNorm = normalizeRequirement("NodeJS");
  assert(nodeNorm.aliases.includes("node.js"), "NodeJS aliases include node.js");

  const daeNorm = normalizeRequirement("DAE Mechanical");
  assert(daeNorm.requiredDegreeRank === DEGREE_RANKS.diploma, "DAE rank is diploma (3)");

  const bsNorm = normalizeRequirement("Bachelor of Science");
  assert(bsNorm.requiredDegreeRank === DEGREE_RANKS.bachelor, "BS rank is bachelor (4)");

  // 2. Classification Tests
  assert(
    classifyMatch("React", "Worked with React and Redux") === "EXACT_MATCH",
    "Classify exact match"
  );
  assert(
    classifyMatch("Node.js", "Backend in NodeJS and Express") === "ALIAS_MATCH",
    "Classify alias match"
  );
  assert(
    classifyMatch("Safety and Health", "Certified in HSE and OSHA") === "SEMANTIC_MATCH",
    "Classify controlled semantic match"
  );
  assert(
    classifyMatch("Python", "Knowledge of JavaScript and HTML") === "NO_MATCH",
    "Classify no match for unrelated terms"
  );

  // 3. Experience Overlap Deduplication
  const overlappingExps = [
    {
      jobTitle: "Dev 1",
      company: "A",
      startDate: "2020-01-01",
      endDate: "2022-12-31",
      isCurrent: false,
      durationYears: 3,
    },
    {
      jobTitle: "Dev 2",
      company: "B",
      startDate: "2021-01-01",
      endDate: "2022-12-31",
      isCurrent: false,
      durationYears: 2,
    },
  ];
  const mergedYears = calculateMergedExperienceYears(overlappingExps);
  assert(
    mergedYears >= 2.8 && mergedYears <= 3.2,
    "Overlapping 2020-2022 and 2021-2022 merged to ~3 years (not 5 years)",
    `Calculated: ${mergedYears}`
  );

  // 4. Deterministic Match Score Calculation
  const testCandidate: CandidateResumeExtraction = {
    candidateName: "Test Dev",
    email: "test@example.com",
    phone: "12345",
    location: "City",
    summary: "Full stack developer",
    skills: ["React", "Node.js", "TypeScript", "SQL"],
    normalizedSkills: ["react", "node.js", "typescript", "sql"],
    experience: [
      {
        jobTitle: "Software Engineer",
        company: "Tech Co",
        startDate: "2020-01-01",
        endDate: "2024-01-01",
        isCurrent: false,
        durationYears: 4,
        description: "Built web applications using React and Node.js",
        skillsUsed: ["React", "Node.js"],
      },
    ],
    education: [
      {
        institution: "Tech University",
        degree: "BS Computer Science",
        fieldOfStudy: "Computer Science",
        graduationYear: "2020",
        isCompleted: true,
        academicStatus: "GRADUATED",
      },
    ],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 4,
    highestDegree: "BS Computer Science",
  };

  const requirements = [
    { title: "React", type: "SKILL", category: "REQUIRED" },
    { title: "Node.js", type: "SKILL", category: "REQUIRED" },
    { title: "Bachelor's Degree", type: "EDUCATION", category: "REQUIRED" },
    { title: "3+ years experience", type: "EXPERIENCE", minimumValue: 3, category: "REQUIRED" },
  ];

  const matchRes = calculateDeterministicMatch({
    candidate: testCandidate,
    rawResumeText: "Test Dev BS Computer Science React Node.js TypeScript 4 years experience",
    requirements,
  });

  assert(matchRes.overallScore === 100, "Candidate with all required qualifications scores 100%");
  assert(matchRes.category === "STRONG_MATCH", "Category is STRONG_MATCH");
  assert(matchRes.matchedRequiredSkillsCount === 2, "2/2 required skills matched");

  console.log(`\n=======================================================`);
  console.log(`ALL ${passed}/${total} MATCHER UNIT TESTS PASSED!`);
  console.log(`=======================================================\n`);
}

runMatcherUnitTests().catch((err) => {
  console.error("Matcher unit tests failed:", err);
  process.exit(1);
});
