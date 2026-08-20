/**
 * ESCO v1.2.1 Skill Intelligence & Normalization Regression Test Suite
 */

import mongoose from "mongoose";
import { normalizeSkillTerm, batchNormalizeSkills } from "../lib/skills/esco-normalizer";
import { evaluateSkillRequirement } from "../lib/skills/skill-matcher";
import { EscoSkill } from "../models/EscoSkill";
import { CandidateResumeExtraction } from "../lib/ai/schemas";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/resume-checker-saas";

async function runEscoTests() {
  console.log("\n=======================================================");
  console.log("RUNNING ESCO v1.2.1 SKILL NORMALIZATION & MATCHER TESTS");
  console.log("=======================================================\n");

  await mongoose.connect(MONGODB_URI);

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

  // -------------------------------------------------------------
  // Test 1: ESCO Database Querying
  // -------------------------------------------------------------
  console.log("--- 1. ESCO Database Collection & URI Verification ---");
  const jsEsco = await EscoSkill.findOne({ normalizedTerm: "javascript" });
  assert(jsEsco !== null, "JavaScript found in local ESCO collection");
  assert(
    jsEsco?.conceptUri === "http://data.europa.eu/esco/skill/3cd569a2-4f88-4c1e-9995-8dce8c5e51a7",
    "JavaScript conceptUri matches official ESCO standard"
  );

  const pythonEsco = await EscoSkill.findOne({ preferredTerm: /python/i });
  assert(pythonEsco !== null, "Python found in local ESCO collection");

  // -------------------------------------------------------------
  // Test 2: Dual Normalization (Resume vs Job Requirement)
  // -------------------------------------------------------------
  console.log("\n--- 2. Canonical Skill Normalization ---");
  const normReact1 = await normalizeSkillTerm("ReactJS");
  const normReact2 = await normalizeSkillTerm("React.js");
  assert(
    normReact1.canonicalKey === normReact2.canonicalKey && normReact1.canonicalKey === "react",
    "ReactJS and React.js both normalize to canonical key 'react'"
  );

  const normNode1 = await normalizeSkillTerm("NodeJS");
  const normNode2 = await normalizeSkillTerm("Node.js");
  assert(
    normNode1.canonicalKey === normNode2.canonicalKey && normNode1.canonicalKey === "nodejs",
    "NodeJS and Node.js both normalize to canonical key 'nodejs'"
  );

  const normPostgres1 = await normalizeSkillTerm("PostgreSQL");
  const normPostgres2 = await normalizeSkillTerm("Postgres");
  assert(
    normPostgres1.canonicalKey === normPostgres2.canonicalKey && normPostgres1.canonicalKey === "postgresql",
    "PostgreSQL and Postgres both normalize to canonical key 'postgresql'"
  );

  const normMongo1 = await normalizeSkillTerm("MongoDB");
  const normMongo2 = await normalizeSkillTerm("Mongo");
  assert(
    normMongo1.canonicalKey === normMongo2.canonicalKey && normMongo1.canonicalKey === "mongodb",
    "MongoDB and Mongo both normalize to canonical key 'mongodb'"
  );

  const normTS1 = await normalizeSkillTerm("TypeScript");
  const normTS2 = await normalizeSkillTerm("TS");
  assert(
    normTS1.canonicalKey === normTS2.canonicalKey && normTS1.canonicalKey === "typescript",
    "TypeScript and TS both normalize to canonical key 'typescript'"
  );

  const normJS1 = await normalizeSkillTerm("JavaScript");
  const normJS2 = await normalizeSkillTerm("JS");
  assert(
    normJS1.canonicalKey === normJS2.canonicalKey && normJS1.canonicalKey === "javascript",
    "JavaScript and JS both normalize to canonical key 'javascript'"
  );

  const normTailwind1 = await normalizeSkillTerm("Tailwind CSS");
  const normTailwind2 = await normalizeSkillTerm("TailwindCSS");
  assert(
    normTailwind1.canonicalKey === normTailwind2.canonicalKey && normTailwind1.canonicalKey === "tailwind",
    "Tailwind CSS and TailwindCSS both normalize to canonical key 'tailwind'"
  );

  // -------------------------------------------------------------
  // Test 3: Batch Normalization
  // -------------------------------------------------------------
  console.log("\n--- 3. Batch Normalization ---");
  const batchList = ["React.js", "Node.js", "PostgreSQL", "Docker", "Python"];
  const batchNorm = await batchNormalizeSkills(batchList);
  assert(batchNorm.length === 5, "Batch normalized all 5 skills");
  assert(batchNorm[0].canonicalKey === "react", "Batch index 0 is react");
  assert(batchNorm[4].canonicalKey === "python", "Batch index 4 is python");

  // -------------------------------------------------------------
  // Test 4: The Linux vs Linux Administration Problem
  // -------------------------------------------------------------
  console.log("\n--- 4. Context-Aware Linux Administration Verification ---");

  // 4a. Candidate with ONLY "Linux" in skills list and NO administration evidence
  // MUST return PARTIAL (NOT NOT_FOUND, NOT automatic EXACT)
  const candidateLinuxOnly: CandidateResumeExtraction = {
    candidateName: "Dev A",
    skills: ["Linux", "Bash", "Docker"],
    normalizedSkills: ["linux", "bash", "docker"],
    experience: [
      {
        jobTitle: "Software Developer",
        company: "App Co",
        startDate: "2022-01-01",
        endDate: "2024-01-01",
        isCurrent: false,
        durationYears: 2,
        description: "Built web features on Linux development machines",
        skillsUsed: ["Bash"],
      },
    ],
    education: [],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 2,
  };

  const evalLinuxOnly = await evaluateSkillRequirement({
    requirementTitle: "Linux Administration",
    rawResumeText: "Dev A\nSkills: Linux, Bash, Docker\nExperience: Built web features on Linux",
    candidate: candidateLinuxOnly,
  });

  assert(
    evalLinuxOnly.status === "PARTIAL",
    "Candidate with 'Linux' alone returns PARTIAL for 'Linux Administration' (NOT automatic EXACT, NOT NOT_FOUND)",
    `Got status: ${evalLinuxOnly.status}`
  );
  assert(
    evalLinuxOnly.matchMethod === "HIERARCHICAL",
    "Match method is HIERARCHICAL",
    `Got method: ${evalLinuxOnly.matchMethod}`
  );
  assert(
    evalLinuxOnly.confidence >= 70 && evalLinuxOnly.confidence <= 85,
    "Confidence is calibrated between 70-85 for partial parent skill",
    `Got confidence: ${evalLinuxOnly.confidence}`
  );
  assert(
    evalLinuxOnly.reasoning.includes("Linux") && evalLinuxOnly.reasoning.includes("Linux Administration"),
    "Reasoning clearly explains general parent skill vs administration responsibilities"
  );

  // 4b. Candidate with VERBATIM administrative work experience
  // "Managed Ubuntu and CentOS servers, configured SSH, users, permissions and system services."
  // MUST return MATCHED (EVIDENCE_VERIFIED) with genuine quoted evidence
  const candidateAdmin: CandidateResumeExtraction = {
    candidateName: "Sysadmin B",
    skills: ["Linux", "Ubuntu", "CentOS", "Bash", "Server Administration"],
    normalizedSkills: ["linux", "ubuntu", "centos", "bash", "server administration"],
    experience: [
      {
        jobTitle: "Linux System Administrator",
        company: "Cloud Hosting Ltd",
        startDate: "2020-01-01",
        endDate: "2024-01-01",
        isCurrent: false,
        durationYears: 4,
        description: "Managed Ubuntu and CentOS servers, configured SSH, users, permissions and system services.",
        skillsUsed: ["Ubuntu", "CentOS", "SSH", "Systemd"],
      },
    ],
    education: [],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 4,
  };

  const evalAdmin = await evaluateSkillRequirement({
    requirementTitle: "Linux Administration",
    rawResumeText: `
      Sysadmin B
      Experience:
      Managed Ubuntu and CentOS servers, configured SSH, users, permissions and system services.
    `,
    candidate: candidateAdmin,
  });

  assert(
    evalAdmin.status === "MATCHED",
    "Candidate with server management context returns MATCHED for 'Linux Administration'",
    `Got status: ${evalAdmin.status}`
  );
  assert(
    evalAdmin.matchMethod === "EVIDENCE_VERIFIED" || evalAdmin.matchMethod === "EXACT" || evalAdmin.matchMethod === "ALIAS",
    "Match method is EVIDENCE_VERIFIED / EXACT",
    `Got method: ${evalAdmin.matchMethod}`
  );
  assert(
    evalAdmin.confidence >= 90,
    "Confidence is >= 90 for verified context evidence",
    `Got confidence: ${evalAdmin.confidence}`
  );
  assert(
    evalAdmin.evidenceQuote !== null && evalAdmin.evidenceQuote.length > 10,
    "Contains genuine verbatim evidence quote from resume",
    `Got quote: ${evalAdmin.evidenceQuote}`
  );

  // -------------------------------------------------------------
  // Test 5: Unrelated Skill Check
  // -------------------------------------------------------------
  console.log("\n--- 5. Unrelated Skill Isolation ---");
  const evalUnrelated = await evaluateSkillRequirement({
    requirementTitle: "JavaScript",
    rawResumeText: "Skills: Python, Django, Flask, PyTorch",
    candidate: {
      candidateName: "Python Dev",
      skills: ["Python", "Django", "Flask"],
      normalizedSkills: ["python", "django", "flask"],
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      languages: ["English"],
      totalExperienceYears: 2,
    },
  });

  assert(
    evalUnrelated.status === "NOT_FOUND",
    "Python candidate evaluating for JavaScript returns NOT_FOUND",
    `Got status: ${evalUnrelated.status}`
  );

  console.log(`\n=======================================================`);
  console.log(`ALL ${passed}/${total} ESCO & SKILL INTELLIGENCE TESTS PASSED!`);
  console.log(`=======================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

runEscoTests().catch(async (err) => {
  console.error("ESCO tests failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
