import { normalizeSkill, calculateDeterministicMatch } from "../lib/ai/matcher";
import { CandidateResumeExtraction } from "../lib/ai/schemas";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runPhase3Tests() {
  console.log("=== Running Phase 3 Verification Tests ===\n");

  // 1. Skill Normalization & Aliases
  console.log("[1] Testing Skill Normalization & Technical Aliases");
  assert(normalizeSkill("React.js") === "react", "React.js normalizes to 'react'");
  assert(normalizeSkill("NextJS") === "next.js", "NextJS normalizes to 'next.js'");
  assert(normalizeSkill("PostgreSQL") === "postgresql", "PostgreSQL normalizes to 'postgresql'");
  assert(normalizeSkill("k8s") === "kubernetes", "k8s normalizes to 'kubernetes'");
  assert(normalizeSkill("TypeScript") === "typescript", "TypeScript normalizes to 'typescript'");
  assert(normalizeSkill("Amazon Web Services") === "aws", "Amazon Web Services normalizes to 'aws'");

  // 2. Setup mock Job Requirements & Candidate
  console.log("\n[2] Testing Deterministic Matching - Strong Match Candidate");
  const jobRequirements = [
    {
      _id: "66c0d8f0e4b0111111111111",
      title: "React",
      category: "REQUIRED",
      type: "SKILL",
      normalizedKey: "react",
    },
    {
      _id: "66c0d8f0e4b0111111111112",
      title: "Node.js",
      category: "REQUIRED",
      type: "SKILL",
      normalizedKey: "node.js",
    },
    {
      _id: "66c0d8f0e4b0111111111113",
      title: "PostgreSQL",
      category: "REQUIRED",
      type: "SKILL",
      normalizedKey: "postgresql",
    },
    {
      _id: "66c0d8f0e4b0111111111114",
      title: "3+ Years Experience",
      category: "REQUIRED",
      type: "EXPERIENCE",
      normalizedKey: "exp_years_3",
      minimumValue: 3,
    },
    {
      _id: "66c0d8f0e4b0111111111115",
      title: "Bachelor's Degree in Computer Science",
      category: "REQUIRED",
      type: "EDUCATION",
      normalizedKey: "edu_bachelor_cs",
    },
    {
      _id: "66c0d8f0e4b0111111111116",
      title: "Docker",
      category: "PREFERRED",
      type: "SKILL",
      normalizedKey: "docker",
    },
  ];

  const strongCandidate: CandidateResumeExtraction = {
    candidateName: "Alex Rivera",
    email: "alex.rivera@example.com",
    phone: "+1-555-0144",
    location: "San Francisco, CA",
    summary: "Senior Full Stack Engineer with 4.5 years experience.",
    skills: ["React", "Node.js", "PostgreSQL", "Docker", "TypeScript"],
    normalizedSkills: ["react", "node.js", "postgresql", "docker", "typescript"],
    experience: [
      {
        jobTitle: "Senior Software Engineer",
        company: "Apex Systems",
        startDate: "2021-01",
        endDate: "Present",
        isCurrent: true,
        description: "Built scalable backend services using Node.js and PostgreSQL, frontend with React.",
        skillsUsed: ["React", "Node.js", "PostgreSQL", "Docker"],
        durationYears: 4.5,
      },
    ],
    education: [
      {
        institution: "UC Berkeley",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        graduationYear: "2020",
      },
    ],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 4.5,
    highestDegree: "Bachelor's",
  };

  const strongResult = calculateDeterministicMatch({
    candidate: strongCandidate,
    requirements: jobRequirements,
  });

  assert(strongResult.overallScore >= 90, "Strong candidate achieves overall score >= 90");
  assert(strongResult.category === "STRONG_MATCH", "Strong candidate categorized as STRONG_MATCH");
  assert(strongResult.matchedRequiredSkillsCount === 3, "3/3 required skills matched");
  assert(strongResult.matchedPreferredSkillsCount === 1, "1/1 preferred skills matched");

  // 3. Testing Possible Match Candidate
  console.log("\n[3] Testing Deterministic Matching - Possible Match Candidate");
  const possibleCandidate: CandidateResumeExtraction = {
    candidateName: "Jordan Lee",
    email: "jordan.lee@example.com",
    phone: "+1-555-0188",
    location: "Austin, TX",
    summary: "Frontend Developer with 2 years experience.",
    skills: ["React", "JavaScript", "HTML", "CSS"],
    normalizedSkills: ["react", "javascript", "html", "css"],
    experience: [
      {
        jobTitle: "Frontend Developer",
        company: "Design Agency",
        startDate: "2022-01",
        endDate: "Present",
        isCurrent: true,
        description: "Built responsive UI components in React.",
        skillsUsed: ["React", "JavaScript"],
        durationYears: 2.2,
      },
    ],
    education: [
      {
        institution: "Austin Community College",
        degree: "Associate Degree",
        fieldOfStudy: "Web Development",
        graduationYear: "2021",
      },
    ],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 2.2,
    highestDegree: "Associate",
  };

  const possibleResult = calculateDeterministicMatch({
    candidate: possibleCandidate,
    requirements: jobRequirements,
  });

  assert(
    possibleResult.category === "POSSIBLE_MATCH" || possibleResult.category === "DOES_NOT_MEET_STATED_REQUIREMENTS",
    "Candidate missing backend skills and experience is categorized as POSSIBLE_MATCH or DOES_NOT_MEET"
  );
  assert(possibleResult.matchedRequiredSkillsCount === 1, "Only 1 of 3 required skills matched");

  // 4. Testing Configurable Scoring Weights
  console.log("\n[4] Testing Custom Scoring Weights");
  const heavySkillsWeights = {
    requiredSkillsWeight: 80,
    experienceWeight: 10,
    educationWeight: 5,
    preferredSkillsWeight: 5,
    otherWeight: 0,
  };

  const weightedResult = calculateDeterministicMatch({
    candidate: strongCandidate,
    requirements: jobRequirements,
    scoringWeights: heavySkillsWeights,
  });

  assert(
    weightedResult.overallScore === 100,
    "Candidate with 100% skills receives 100 on skill-heavy weighting"
  );

  // 5. Testing Screening Policy Thresholds
  console.log("\n[5] Testing Screening Policy Human Review Flagging");
  const strictPolicy = {
    requiredSkillsMustMatch: true,
    minimumExperienceMustMatch: true,
    educationRequired: false,
    humanReviewBelowScore: 95, // high threshold
  };

  const policyResult = calculateDeterministicMatch({
    candidate: strongCandidate,
    requirements: jobRequirements,
    screeningPolicy: strictPolicy,
  });

  assert(
    policyResult.category === "STRONG_MATCH",
    "Candidate meeting all requirements passes strict policy"
  );

  console.log(`\n=========================================`);
  console.log(`Phase 3 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`=========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
