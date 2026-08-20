/**
 * Evidence Consistency Auditor Test Suite
 * 
 * Verifies that Gemini false negatives or hallucinations cannot override
 * direct resume matches and that evidence integrity rules are strictly enforced.
 */

import { auditEvidenceConsistency } from "../lib/ai/evidence-auditor";
import { EvaluatedRequirement } from "../lib/ai/matcher";
import { SingleRequirementVerification } from "../lib/ai/schemas";

async function runEvidenceAuditorTests() {
  console.log("\n=======================================================");
  console.log("RUNNING EVIDENCE CONSISTENCY AUDITOR TESTS");
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

  const rawResume = `
MUHAMMAD AHMED
NEBOSH (The National Examination Board in Occupational Safety & Health UK) – 2022
OSHA 30 Hours Certified – 2024
DAE Mechanical Engineering from Govt Polytechnic Institute (2018)
5 years HSE Officer experience
`.trim();

  // Test 1: Gemini returns NOT_FOUND for a qualification directly in the resume text
  // The auditor MUST preserve the deterministic MATCHED status.
  const evalReqs1: EvaluatedRequirement[] = [
    {
      jobRequirementId: "req-1",
      requirementTitle: "NEBOSH",
      requirementCategory: "REQUIRED",
      requirementType: "CERTIFICATION",
      status: "MATCHED",
      evidenceQuote: "NEBOSH (The National Examination Board in Occupational Safety & Health UK) – 2022",
      reasoning: "Direct match found in resume.",
      confidence: 0.98,
      scoreContribution: 100,
    },
  ];

  const geminiVerifications1: SingleRequirementVerification[] = [
    {
      requirementId: "req-1",
      requirementTitle: "NEBOSH",
      requirementType: "CERTIFICATION",
      requirementCategory: "REQUIRED",
      status: "NOT_FOUND", // Gemini hallucination / false negative
      evidenceQuote: "",
      reasoning: "Not found in resume according to LLM.",
      confidence: 0.8,
      verifiedByAi: true,
    },
  ];

  const res1 = auditEvidenceConsistency({
    evaluatedRequirements: evalReqs1,
    rawResumeText: rawResume,
    geminiVerifications: geminiVerifications1,
  });

  assert(
    res1.requirements[0].status === "MATCHED",
    "Test 1: Auditor preserves MATCHED status despite Gemini false negative",
    `Got status: ${res1.requirements[0].status}`
  );
  assert(
    res1.requirements[0].evidenceQuote.includes("NEBOSH"),
    "Test 1b: Verbatim NEBOSH quote is preserved",
    `Quote: ${res1.requirements[0].evidenceQuote}`
  );

  // Test 2: Status = MATCHED but evidence quote is missing and absent from text -> downgrades to UNCLEAR
  const evalReqs2: EvaluatedRequirement[] = [
    {
      jobRequirementId: "req-2",
      requirementTitle: "Unverified Skill XYZ",
      requirementCategory: "REQUIRED",
      requirementType: "SKILL",
      status: "MATCHED",
      evidenceQuote: "",
      reasoning: "Marked matched without evidence.",
      confidence: 0.9,
      scoreContribution: 100,
    },
  ];

  const res2 = auditEvidenceConsistency({
    evaluatedRequirements: evalReqs2,
    rawResumeText: rawResume,
    geminiVerifications: [],
  });

  assert(
    res2.requirements[0].status === "UNCLEAR",
    "Test 2: Auditor downgrades to UNCLEAR when evidence quote is missing and not in text",
    `Got status: ${res2.requirements[0].status}`
  );
  assert(
    res2.humanReviewRecommended === true,
    "Test 2b: Human review is recommended for UNCLEAR critical requirement"
  );

  // Test 3: Anti-Cross-Contamination Guard
  // Degree quote attached to a SKILL requirement is filtered out
  const evalReqs3: EvaluatedRequirement[] = [
    {
      jobRequirementId: "req-3",
      requirementTitle: "Rust Programming",
      requirementCategory: "REQUIRED",
      requirementType: "SKILL",
      status: "MATCHED",
      evidenceQuote: "DAE Mechanical Engineering from Govt Polytechnic Institute", // Contaminated degree quote
      reasoning: "Skill claim",
      confidence: 0.8,
      scoreContribution: 100,
    },
  ];

  const res3 = auditEvidenceConsistency({
    evaluatedRequirements: evalReqs3,
    rawResumeText: rawResume,
    geminiVerifications: [],
  });

  assert(
    res3.requirements[0].status === "NOT_FOUND",
    "Test 3: Cross-contaminated degree quote on non-existent skill is stripped and marked NOT_FOUND",
    `Got status: ${res3.requirements[0].status}`
  );

  console.log(`\n=======================================================`);
  console.log(`ALL ${passed}/${total} EVIDENCE AUDITOR TESTS PASSED!`);
  console.log(`=======================================================\n`);
}

runEvidenceAuditorTests().catch((err) => {
  console.error("Evidence auditor tests failed:", err);
  process.exit(1);
});
