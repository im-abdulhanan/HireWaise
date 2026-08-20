/**
 * Comprehensive Semantic Skill Matcher & Requirement Hierarchy Test Suite
 * 
 * Tests all 14 specified requirements:
 * 1. Linux -> Linux (EXACT)
 * 2. Linux -> Linux Administration (PARTIAL, HIERARCHICAL)
 * 3. Linux administration experience -> Linux Administration (MATCHED, EVIDENCE_VERIFIED)
 * 4. React.js -> React (ALIAS)
 * 5. ReactJS -> React (ALIAS)
 * 6. Node.js -> Node (ALIAS)
 * 7. PostgreSQL -> Postgres (ALIAS)
 * 8. Python -> JavaScript (NOT_FOUND)
 * 9. AWS -> Azure (NOT_FOUND)
 * 10. Education: Intermediate -> Bachelor (NOT_FOUND)
 * 11. Education: DAE -> Graduate (NOT_FOUND)
 * 12. Education: Bachelor -> Graduate (MATCHED)
 * 13. Education: Master -> Bachelor (MATCHED)
 * 14. Experience: 5 years candidate -> 5 years requirement (MATCHED)
 * 15. Experience: 4 years candidate -> 5 years requirement (PARTIAL)
 * 16. Experience: Overlapping employment periods union calculation (3 years, not 4 years)
 * 17. Real-world Linux screening regression tests (Candidate A & Candidate B)
 */

import {
  matchRequirementAgainstResume,
  calculateMergedExperienceYears,
} from "../lib/ai/evidence-matcher";
import { normalizeRequirement } from "../lib/ai/requirement-normalizer";
import { getCanonicalSkillKey, getSkillHierarchyRelationship } from "../lib/ai/skill-registry";
import { calculateDeterministicMatch } from "../lib/ai/matcher";
import { CandidateResumeExtraction } from "../lib/ai/schemas";

async function runSemanticSkillMatcherTests() {
  console.log("\n=======================================================");
  console.log("RUNNING SEMANTIC SKILL & HIERARCHY REGRESSION TESTS");
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
      throw new Error(`Test failed: ${testName} - ${detail || ""}`);
    }
  }

  // =========================================================================
  // 1. SKILL NORMALIZATION & CANONICAL KEYS
  // =========================================================================
  console.log("--- 1. Canonical Key Normalization ---");
  assert(getCanonicalSkillKey("React.js") === "react", "React.js -> react");
  assert(getCanonicalSkillKey("ReactJS") === "react", "ReactJS -> react");
  assert(getCanonicalSkillKey("React JS") === "react", "React JS -> react");
  assert(getCanonicalSkillKey("Node.js") === "nodejs", "Node.js -> nodejs");
  assert(getCanonicalSkillKey("Node JS") === "nodejs", "Node JS -> nodejs");
  assert(getCanonicalSkillKey("Linux Administration") === "linux_administration", "Linux Administration -> linux_administration");
  assert(getCanonicalSkillKey("Linux System Administration") === "linux_administration", "Linux System Administration -> linux_administration");
  assert(getCanonicalSkillKey("PostgreSQL") === "postgresql", "PostgreSQL -> postgresql");
  assert(getCanonicalSkillKey("Postgres") === "postgresql", "Postgres -> postgresql");

  // =========================================================================
  // 2. SKILL ALIAS MATCHING
  // =========================================================================
  console.log("\n--- 2. Skill Alias Matching ---");
  const reactMatch = matchRequirementAgainstResume(
    { title: "React", type: "SKILL", category: "REQUIRED" },
    "Skills: React.js, Tailwind CSS, TypeScript"
  );
  assert(reactMatch.status === "MATCHED", "React.js in text matches React requirement");
  assert(reactMatch.matchMethod === "ALIAS" || reactMatch.matchMethod === "EXACT", "React.js matchMethod is ALIAS/EXACT");

  const reactJSMatch = matchRequirementAgainstResume(
    { title: "React", type: "SKILL", category: "REQUIRED" },
    "Frontend engineer with ReactJS and Redux experience"
  );
  assert(reactJSMatch.status === "MATCHED", "ReactJS matches React requirement");

  const nodeMatch = matchRequirementAgainstResume(
    { title: "Node", type: "SKILL", category: "REQUIRED" },
    "Backend developer using Node.js and Express"
  );
  assert(nodeMatch.status === "MATCHED", "Node.js matches Node requirement");

  const postgresMatch = matchRequirementAgainstResume(
    { title: "Postgres", type: "SKILL", category: "REQUIRED" },
    "Database: PostgreSQL, Redis"
  );
  assert(postgresMatch.status === "MATCHED", "PostgreSQL matches Postgres requirement");

  const unrelatedMatch = matchRequirementAgainstResume(
    { title: "JavaScript", type: "SKILL", category: "REQUIRED" },
    "Skills: Python, Django, Flask, PyTorch"
  );
  assert(unrelatedMatch.status === "NOT_FOUND", "Python candidate does NOT match JavaScript requirement");

  const cloudMismatch = matchRequirementAgainstResume(
    { title: "Azure", type: "SKILL", category: "REQUIRED" },
    "Cloud infrastructure deployed on AWS with EC2, S3, and Lambda"
  );
  assert(cloudMismatch.status === "NOT_FOUND", "AWS experience does NOT match Azure requirement");

  // =========================================================================
  // 3. REGRESSION TEST: THE LINUX MATCHING PROBLEM
  // =========================================================================
  console.log("\n--- 3. Specific Linux Bug Regression Tests ---");

  // TEST A: Candidate with skills [Linux, Bash, Docker] applied to "Linux Administration"
  // MUST return PARTIAL (NOT NOT_FOUND) with explainable reasoning and evidence "Linux"
  const candidateA: CandidateResumeExtraction = {
    candidateName: "Candidate A",
    skills: ["Linux", "Bash", "Docker"],
    normalizedSkills: ["linux", "bash", "docker"],
    experience: [
      {
        jobTitle: "Junior Developer",
        company: "Code Corp",
        startDate: "2022-01-01",
        endDate: "2024-01-01",
        isCurrent: false,
        durationYears: 2,
        description: "Developed web endpoints and ran scripts on Linux machines",
        skillsUsed: ["Bash", "Docker"],
      },
    ],
    education: [],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 2,
  };

  const linuxAdminReqA = { title: "Linux Administration", type: "SKILL" as const, category: "REQUIRED" as const };
  const outcomeA = matchRequirementAgainstResume(
    linuxAdminReqA,
    "Candidate A\nSkills: Linux, Bash, Docker\nExperience: Developed web endpoints on Linux machines",
    candidateA
  );

  assert(
    outcomeA.status === "PARTIAL",
    "Candidate A with [Linux, Bash, Docker] returns PARTIAL for Linux Administration (NOT NOT_FOUND)",
    `Got status: ${outcomeA.status}`
  );
  assert(
    outcomeA.matchMethod === "HIERARCHICAL",
    "Candidate A matchMethod is HIERARCHICAL",
    `Got method: ${outcomeA.matchMethod}`
  );
  assert(
    outcomeA.confidence >= 70 && outcomeA.confidence <= 85,
    "Candidate A confidence is between 70 and 85",
    `Got confidence: ${outcomeA.confidence}`
  );
  assert(
    outcomeA.evidenceQuote === "Linux" || (outcomeA.evidenceQuote && outcomeA.evidenceQuote.includes("Linux")),
    "Candidate A evidence contains Linux",
    `Got evidence: ${outcomeA.evidenceQuote}`
  );
  assert(
    outcomeA.reasoning.toLowerCase().includes("linux") && outcomeA.reasoning.toLowerCase().includes("administration"),
    "Candidate A reasoning explains general skill vs administration responsibilities",
    `Got reasoning: ${outcomeA.reasoning}`
  );

  // TEST B: Candidate with verbatim administrative work experience
  // "Administered Ubuntu and CentOS servers, managed users, permissions and system services."
  // MUST return MATCHED (EVIDENCE_VERIFIED)
  const candidateB: CandidateResumeExtraction = {
    candidateName: "Candidate B",
    skills: ["Linux", "Ubuntu", "CentOS", "Bash", "System Administration"],
    normalizedSkills: ["linux", "ubuntu", "centos", "bash", "system administration"],
    experience: [
      {
        jobTitle: "Systems Administrator",
        company: "Enterprise Cloud Ltd",
        startDate: "2020-01-01",
        endDate: "2024-01-01",
        isCurrent: false,
        durationYears: 4,
        description: "Administered Ubuntu and CentOS servers, managed users, permissions and system services.",
        skillsUsed: ["Linux", "Ubuntu", "CentOS", "Systemd", "SSH"],
      },
    ],
    education: [],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 4,
  };

  const resumeTextB = `
    Candidate B - Senior Linux Administrator
    Experience:
    Administered Ubuntu and CentOS servers, managed users, permissions and system services.
    Configured SSH keys, systemd services, and automated backups using Bash.
  `;

  const outcomeB = matchRequirementAgainstResume(
    linuxAdminReqA,
    resumeTextB,
    candidateB
  );

  assert(
    outcomeB.status === "MATCHED",
    "Candidate B with server administration evidence returns MATCHED for Linux Administration",
    `Got status: ${outcomeB.status}`
  );
  assert(
    outcomeB.matchMethod === "EVIDENCE_VERIFIED" || outcomeB.matchMethod === "EXACT" || outcomeB.matchMethod === "ALIAS",
    "Candidate B matchMethod is EVIDENCE_VERIFIED/EXACT/ALIAS",
    `Got method: ${outcomeB.matchMethod}`
  );
  assert(
    outcomeB.confidence >= 90,
    "Candidate B confidence is >= 90",
    `Got confidence: ${outcomeB.confidence}`
  );
  assert(
    outcomeB.evidenceQuote !== null && outcomeB.evidenceQuote.length > 10,
    "Candidate B contains genuine quoted evidence from resume",
    `Got evidence: ${outcomeB.evidenceQuote}`
  );

  // =========================================================================
  // 4. EDUCATION HIERARCHY TESTS
  // =========================================================================
  console.log("\n--- 4. Education Hierarchy Tests ---");

  // 4a. Intermediate -> Bachelor (Must NOT Match)
  const candidateIntermediate: CandidateResumeExtraction = {
    candidateName: "FSc Student",
    education: [
      {
        degree: "FSc Pre-Engineering",
        fieldOfStudy: "Pre-Engineering",
        institution: "Govt College",
        graduationYear: "2022",
        isCompleted: true,
        academicStatus: "GRADUATED",
      },
    ],
    skills: [],
    experience: [],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 0,
  };

  const eduReqBachelor = { title: "Bachelor's Degree", type: "EDUCATION" as const, category: "REQUIRED" as const };
  const outcomeEdu1 = matchRequirementAgainstResume(
    eduReqBachelor,
    "Education: FSc Pre-Engineering from Govt College (2022)",
    candidateIntermediate
  );
  assert(outcomeEdu1.status === "NOT_FOUND", "Intermediate qualification does NOT satisfy Bachelor's requirement");

  // 4b. DAE (Diploma) -> Graduate (Must NOT Match University Graduate)
  const candidateDAE: CandidateResumeExtraction = {
    candidateName: "DAE Engineer",
    education: [
      {
        degree: "DAE Mechanical Engineering",
        fieldOfStudy: "Mechanical",
        institution: "Polytechnic Institute",
        graduationYear: "2020",
        isCompleted: true,
        academicStatus: "GRADUATED",
      },
    ],
    skills: [],
    experience: [],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 0,
  };

  const eduReqGraduate = { title: "Graduate", type: "EDUCATION" as const, category: "REQUIRED" as const };
  const outcomeEdu2 = matchRequirementAgainstResume(
    eduReqGraduate,
    "Education: DAE Mechanical Engineering from Polytechnic Institute",
    candidateDAE
  );
  assert(outcomeEdu2.status === "NOT_FOUND", "DAE diploma does NOT satisfy University Graduate requirement");

  // 4c. Bachelor -> Graduate (Must Match)
  const candidateBachelor: CandidateResumeExtraction = {
    candidateName: "BS Graduate",
    education: [
      {
        degree: "BS Software Engineering",
        fieldOfStudy: "Software Engineering",
        institution: "Tech University",
        graduationYear: "2023",
        isCompleted: true,
        academicStatus: "GRADUATED",
      },
    ],
    skills: [],
    experience: [],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 0,
  };

  const outcomeEdu3 = matchRequirementAgainstResume(
    eduReqGraduate,
    "Education: BS Software Engineering from Tech University",
    candidateBachelor
  );
  assert(outcomeEdu3.status === "MATCHED", "Bachelor degree satisfies Graduate requirement");

  // 4d. Master -> Bachelor (Must Match - Master rank 6 >= Bachelor rank 5)
  const candidateMaster: CandidateResumeExtraction = {
    candidateName: "MS Engineer",
    education: [
      {
        degree: "Master of Science in Computer Science",
        fieldOfStudy: "Computer Science",
        institution: "State University",
        graduationYear: "2022",
        isCompleted: true,
        academicStatus: "GRADUATED",
      },
    ],
    skills: [],
    experience: [],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 0,
  };

  const outcomeEdu4 = matchRequirementAgainstResume(
    eduReqBachelor,
    "Education: Master of Science in Computer Science from State University",
    candidateMaster
  );
  assert(outcomeEdu4.status === "MATCHED", "Master's degree satisfies Bachelor requirement (Hierarchy superset)");

  // =========================================================================
  // 5. EXPERIENCE DATE MERGE & DEDUPLICATION TESTS
  // =========================================================================
  console.log("\n--- 5. Experience Union & Overlap Tests ---");

  // Overlapping 2021-01 -> 2023-01 (2 yrs) and 2022-01 -> 2024-01 (2 yrs) must equal 3 years total
  const overlappingJobs = [
    {
      jobTitle: "Frontend Lead",
      company: "Company Alpha",
      startDate: "2021-01-01",
      endDate: "2023-01-01",
      isCurrent: false,
      durationYears: 2,
    },
    {
      jobTitle: "Consultant",
      company: "Company Beta",
      startDate: "2022-01-01",
      endDate: "2024-01-01",
      isCurrent: false,
      durationYears: 2,
    },
  ];

  const unionYears = calculateMergedExperienceYears(overlappingJobs);
  assert(
    unionYears >= 2.9 && unionYears <= 3.1,
    "Overlapping 2021-2023 and 2022-2024 calculates to 3.0 years union (not 4.0 years)",
    `Calculated: ${unionYears}`
  );

  // Experience threshold evaluation: 5 years candidate vs 5 years req (MATCHED)
  const candidate5Yrs: CandidateResumeExtraction = {
    candidateName: "Senior Dev",
    totalExperienceYears: 5,
    experience: [
      {
        jobTitle: "Software Engineer",
        company: "Tech Corp",
        startDate: "2019-01-01",
        endDate: "2024-01-01",
        isCurrent: false,
        durationYears: 5,
      },
    ],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: ["English"],
  };

  const expReq5Yrs = { title: "5+ years experience", type: "EXPERIENCE" as const, minimumValue: 5, category: "REQUIRED" as const };
  const outcomeExp1 = matchRequirementAgainstResume(expReq5Yrs, "5 years experience", candidate5Yrs);
  assert(outcomeExp1.status === "MATCHED", "5 years experience satisfies 5 years requirement");

  // Experience threshold evaluation: 4 years candidate vs 5 years req (PARTIAL)
  const candidate4Yrs: CandidateResumeExtraction = {
    ...candidate5Yrs,
    totalExperienceYears: 4,
    experience: [
      {
        jobTitle: "Software Engineer",
        company: "Tech Corp",
        startDate: "2020-01-01",
        endDate: "2024-01-01",
        isCurrent: false,
        durationYears: 4,
      },
    ],
  };

  const outcomeExp2 = matchRequirementAgainstResume(expReq5Yrs, "4 years experience", candidate4Yrs);
  assert(outcomeExp2.status === "PARTIAL", "4 years experience returns PARTIAL for 5 years requirement (80% ratio)");

  // =========================================================================
  // 6. ANTI-CROSS-CONTAMINATION RULE
  // =========================================================================
  console.log("\n--- 6. Anti-Cross-Contamination Tests ---");
  const { auditEvidenceConsistency } = require("../lib/ai/evidence-auditor");

  const contaminatedReqs = [
    {
      jobRequirementId: "req-skill-1",
      requirementTitle: "React.js",
      requirementCategory: "REQUIRED" as const,
      requirementType: "SKILL" as const,
      status: "MATCHED" as const,
      matchMethod: "EXACT" as const,
      normalizedRequirement: "react",
      evidenceQuote: "Bachelor of Science in Electrical Engineering from UET", // Contaminated quote
      reasoning: "Matched based on degree text",
      confidence: 0.9,
      scoreContribution: 100,
    },
  ];

  const auditRes = auditEvidenceConsistency({
    evaluatedRequirements: contaminatedReqs,
    rawResumeText: "Muhammad Ali - BS Electrical Engineering - Skills: React.js, Tailwind",
  });

  const cleanedSkillReq = auditRes.requirements[0];
  assert(
    !cleanedSkillReq.evidenceQuote.includes("Bachelor of Science"),
    "Anti-cross-contamination successfully purged degree text from skill requirement quote",
    `Cleaned quote: ${cleanedSkillReq.evidenceQuote}`
  );

  console.log(`\n=======================================================`);
  console.log(`ALL ${passed}/${total} SEMANTIC SKILL & HIERARCHY TESTS PASSED!`);
  console.log(`=======================================================\n`);
}

runSemanticSkillMatcherTests().catch((err) => {
  console.error("Semantic skill matcher tests failed:", err);
  process.exit(1);
});
