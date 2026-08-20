/**
 * False-Positive Skill & Acronym Regression Test Suite
 * 
 * Specifically prevents:
 * 1. Short letter tokens (e.g. 'c' from 'c#', 'net' from '.net') colliding with words containing that letter (e.g. 'Block chain', 'CIA', 'Coursera').
 * 2. Unrelated certificates falsely matching requirements (e.g. Google Cybersecurity matching Block chain or CIA).
 */

import { getCanonicalSkillKey } from "../lib/ai/skill-registry";
import { normalizeRequirement } from "../lib/ai/requirement-normalizer";
import { matchRequirementAgainstResume } from "../lib/ai/evidence-matcher";
import { evaluateSkillRequirement } from "../lib/skills/skill-matcher";
import { CandidateResumeExtraction } from "../lib/ai/schemas";

async function runTests() {
  console.log("\n=======================================================");
  console.log("RUNNING FALSE-POSITIVE SKILL & ACRONYM REGRESSION TESTS");
  console.log("=======================================================\n");

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ [PASSED] ${testName}`);
    } else {
      console.error(`  ✗ [FAILED] ${testName}: ${detail || "Condition not met"}`);
      throw new Error(`Test failed: ${testName} - ${detail || ""}`);
    }
  }

  // 1. Canonical Key Accuracy
  console.log("--- 1. Canonical Key Normalization ---");
  const blockchainKey = getCanonicalSkillKey("Block chain");
  assert(
    blockchainKey === "blockchain",
    "'Block chain' normalizes to 'blockchain' (NOT 'csharp')",
    `Got: ${blockchainKey}`
  );

  const ciaKey = getCanonicalSkillKey("CIA");
  assert(
    ciaKey === "cia",
    "'CIA' normalizes to 'cia' (NOT 'csharp')",
    `Got: ${ciaKey}`
  );

  const cyberKey = getCanonicalSkillKey("Cybersecurity");
  assert(
    cyberKey === "cybersecurity",
    "'Cybersecurity' normalizes to 'cybersecurity' (NOT 'csharp')",
    `Got: ${cyberKey}`
  );

  const csharpKey = getCanonicalSkillKey("C#");
  assert(
    csharpKey === "csharp",
    "'C#' normalizes to 'csharp'",
    `Got: ${csharpKey}`
  );

  // 2. Candidate with Google Cybersecurity Certificate
  console.log("\n--- 2. Direct Evidence Non-Contamination Tests ---");
  const candidateWithCyberCert: CandidateResumeExtraction = {
    candidateName: "Security Candidate",
    skills: ["Network Security", "Incident Response", "SIEM"],
    normalizedSkills: ["network_security", "incident_response", "siem"],
    experience: [
      {
        jobTitle: "Security Analyst",
        company: "Defend Corp",
        startDate: "2022-01-01",
        endDate: "2024-01-01",
        isCurrent: false,
        durationYears: 2,
        description: "Monitored security alerts and analyzed network traffic",
        skillsUsed: ["SIEM"],
      },
    ],
    education: [],
    projects: [],
    certifications: [
      {
        name: "Google Cybersecurity Professional Certificate – Coursera",
        issuer: "Coursera",
        year: 2023,
      },
    ],
    languages: ["English"],
    totalExperienceYears: 2,
  };

  const rawResumeText = `
    Security Candidate
    Certifications:
    Google Cybersecurity Professional Certificate – Coursera
    Experience:
    Security Analyst at Defend Corp. Monitored security alerts and analyzed network traffic.
  `;

  // Test 2a: Block chain requirement on candidate who only has Google Cybersecurity Certificate
  const blockChainMatch = matchRequirementAgainstResume(
    { title: "Block chain", type: "SKILL", category: "REQUIRED" },
    rawResumeText,
    candidateWithCyberCert
  );

  assert(
    blockChainMatch.status === "NOT_FOUND",
    "Google Cybersecurity Certificate does NOT match 'Block chain' requirement (Status is NOT_FOUND)",
    `Got status: ${blockChainMatch.status}, quote: ${blockChainMatch.evidenceQuote}, reasoning: ${blockChainMatch.reasoning}`
  );
  assert(
    blockChainMatch.normalizedRequirement === "blockchain",
    "Block chain normalized requirement is 'blockchain' (NOT 'csharp')"
  );

  // Test 2b: CIA requirement on candidate without CIA mentions
  const ciaMatch = matchRequirementAgainstResume(
    { title: "CIA", type: "SKILL", category: "REQUIRED" },
    rawResumeText,
    candidateWithCyberCert
  );

  assert(
    ciaMatch.status === "NOT_FOUND",
    "Google Cybersecurity Certificate does NOT match 'CIA' requirement (Status is NOT_FOUND)",
    `Got status: ${ciaMatch.status}, quote: ${ciaMatch.evidenceQuote}, reasoning: ${ciaMatch.reasoning}`
  );
  assert(
    ciaMatch.normalizedRequirement === "cia",
    "CIA normalized requirement is 'cia' (NOT 'csharp')"
  );

  // Test 2c: Cybersecurity requirement SHOULD match Google Cybersecurity Certificate
  const cyberMatch = matchRequirementAgainstResume(
    { title: "Cybersecurity", type: "SKILL", category: "REQUIRED" },
    rawResumeText,
    candidateWithCyberCert
  );

  assert(
    cyberMatch.status === "MATCHED",
    "Google Cybersecurity Certificate successfully MATCHES 'Cybersecurity' requirement",
    `Got status: ${cyberMatch.status}`
  );

  console.log("\n=======================================================");
  console.log("ALL FALSE-POSITIVE REGRESSION TESTS PASSED!");
  console.log("=======================================================\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
