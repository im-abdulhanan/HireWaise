/**
 * Zod Schema Preprocessing & Auto-Healing Regression Tests
 *
 * Verifies that candidate extraction, requirements extraction, and verification schemas
 * safely parse and auto-heal imperfect Gemini responses (strings in object arrays,
 * malformed email, missing fields) without throwing validation errors.
 */

import {
  CandidateResumeExtractionSchema,
  JobRequirementsExtractionSchema,
  EvidenceVerificationReportSchema,
} from "../lib/ai/schemas";
import { cleanAndParseJSON } from "../lib/ai/gemini";

async function runSchemasTests() {
  console.log("\n=======================================================");
  console.log("RUNNING ZOD SCHEMA AUTO-HEALING & RESILIENCE TESTS");
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

  // -------------------------------------------------------------
  // Test 1: Certifications as string[] (Exact bug that triggered pipeline failure)
  // -------------------------------------------------------------
  const geminiPayloadWithStringCerts = {
    candidateName: "Muhammad Ahmed",
    email: "ahmed@example.com",
    phone: "12345",
    location: "Karachi",
    skills: ["NEBOSH", "OSHA", "HSE"],
    experience: [],
    education: [],
    // Gemini returned string array instead of object array
    certifications: [
      "NEBOSH (Occupational Safety & Health UK) – 2022",
      "OSHA 30 Hours – 2024",
      "IOSH Managing Safely",
    ],
  };

  const parsedCandidate1 = CandidateResumeExtractionSchema.parse(geminiPayloadWithStringCerts);
  assert(
    parsedCandidate1.certifications.length === 3,
    "Test 1: Certifications array of strings auto-heals into 3 certification objects"
  );
  assert(
    parsedCandidate1.certifications[0].name === "NEBOSH (Occupational Safety & Health UK) – 2022",
    "Test 1b: First certification name correctly extracted from string"
  );

  // -------------------------------------------------------------
  // Test 2: Education as string[] and partial objects
  // -------------------------------------------------------------
  const geminiPayloadWithStringEdu = {
    candidateName: "John Doe",
    email: "john@example.com",
    skills: ["React"],
    experience: [],
    education: [
      "DAE Mechanical Engineering - Govt Polytechnic (2018)",
      { degree: "BS Computer Science", graduationYear: "2022" }, // Missing institution
    ],
    certifications: [],
  };

  const parsedCandidate2 = CandidateResumeExtractionSchema.parse(geminiPayloadWithStringEdu);
  assert(
    parsedCandidate2.education.length === 2,
    "Test 2: Education array with strings and partial objects auto-heals"
  );
  assert(
    parsedCandidate2.education[0].degree.includes("DAE"),
    "Test 2b: String education item converted to object with degree text"
  );
  assert(
    parsedCandidate2.education[1].institution === "Academic Institution",
    "Test 2c: Missing institution field defaulted safely without error"
  );

  // -------------------------------------------------------------
  // Test 3: Experience as string[] and partial objects
  // -------------------------------------------------------------
  const geminiPayloadWithStringExp = {
    candidateName: "Jane Smith",
    skills: ["Python"],
    experience: [
      "Safety Officer at ABC Builders from 2019 to 2022",
      { description: "Managed web development team" }, // Missing jobTitle & company
    ],
    education: [],
    certifications: [],
  };

  const parsedCandidate3 = CandidateResumeExtractionSchema.parse(geminiPayloadWithStringExp);
  assert(
    parsedCandidate3.experience.length === 2,
    "Test 3: Experience array with strings auto-heals"
  );
  assert(
    parsedCandidate3.experience[0].description.includes("Safety Officer"),
    "Test 3b: Experience string preserved in description"
  );

  // -------------------------------------------------------------
  // Test 4: JSON cleaner with markdown code blocks and conversational filler
  // -------------------------------------------------------------
  const rawGeminiText = `
Here is the extracted candidate information:
\`\`\`json
{
  "candidateName": "Ali Khan",
  "email": "ali@example.com",
  "skills": ["JavaScript", "TypeScript"],
  "certifications": ["AWS Certified Developer"],
  "totalExperienceYears": 3
}
\`\`\`
Hope this helps!
`.trim();

  const cleanedJson = cleanAndParseJSON(rawGeminiText);
  assert(cleanedJson.candidateName === "Ali Khan", "Test 4: cleanAndParseJSON extracts JSON from conversational wrappers");
  const parsedCandidate4 = CandidateResumeExtractionSchema.parse(cleanedJson);
  assert(parsedCandidate4.skills.length === 2, "Test 4b: Schema parses cleaned JSON successfully");

  // -------------------------------------------------------------
  // Test 5: Evidence Verification Report with partial array items
  // -------------------------------------------------------------
  const rawVerificationPayload = {
    verifiedRequirements: [
      {
        requirementId: "req-1",
        title: "NEBOSH", // Uses 'title' instead of 'requirementTitle'
        status: "MATCHED",
        evidence: "NEBOSH UK 2022", // Uses 'evidence' instead of 'evidenceQuote'
      },
      {
        id: "req-2",
        requirementTitle: "OSHA",
        status: "MATCHED",
      },
    ],
    overallConfidence: 0.95,
  };

  const parsedVerification = EvidenceVerificationReportSchema.parse(rawVerificationPayload);
  assert(
    parsedVerification.verifiedRequirements.length === 2,
    "Test 5: EvidenceVerificationReportSchema normalizes varied field names"
  );
  assert(
    parsedVerification.verifiedRequirements[0].requirementTitle === "NEBOSH",
    "Test 5b: Normalized title mapped to requirementTitle"
  );

  console.log(`\n=======================================================`);
  console.log(`ALL ${passed}/${total} SCHEMA AUTO-HEALING TESTS PASSED!`);
  console.log(`=======================================================\n`);
}

runSchemasTests().catch((err) => {
  console.error("Schema tests failed:", err);
  process.exit(1);
});
