/**
 * Resume Accuracy & False-Negative Prevention Regression Suite
 * 
 * Verifies that the multi-layer screening engine correctly extracts and matches
 * qualifications directly present in the resume without false negatives or hallucinations.
 */

import { matchRequirementAgainstResume, calculateMergedExperienceYears } from "../lib/ai/evidence-matcher";
import { normalizeRequirement } from "../lib/ai/requirement-normalizer";
import { CandidateResumeExtraction } from "../lib/ai/schemas";

const sampleHseResumeText = `
MUHAMMAD AHMED
HSE & SAFETY OFFICER
Email: ahmed.safety@example.com | Phone: +92 300 1234567 | Location: Karachi, Pakistan

PROFESSIONAL SUMMARY
Dedicated and certified Health Safety Environmental (HSE) professional with extensive field experience in industrial safety, risk assessment, and hazard identification. Proven track record in maintaining OSHA and NEBOSH compliance across high-scale engineering and construction projects.

EDUCATION & QUALIFICATIONS
• DAE Mechanical Engineering (Diploma of Associate Engineer) – Govt Polytechnic Institute (2015 – 2018)
• Intermediate in Pre-Engineering (HSSC) – Board of Intermediate Education (2013 – 2015)

PROFESSIONAL CERTIFICATIONS
• NEBOSH (The National Examination Board in Occupational Safety & Health UK) – 2022
• OSHA (Occupational Safety and Health Administration 30 Hours) – 2024
• IOSH (Managing Safely) – 2021
• First Aid & CPR Certified – Red Crescent (2023)

TECHNICAL & OPERATIONAL SKILLS
• Health, Safety and Environment (HSE) Management
• Safety and Health Audit Procedures
• Computer Operator & Data Entry Specialist (MS Office, Word, Excel)
• Incident Investigation & Root Cause Analysis

WORK EXPERIENCE
1. HSE Officer – ABC Builders Ltd
   January 2019 – December 2021 (3 years)
   - Supervised site safety, conducted tool-box talks, and ensured NEBOSH compliance.
   - Prepared weekly HSE reports and safety inspection audits.

2. Safety Coordinator – XYZ Industrial Solutions
   January 2021 – December 2024 (4 years, overlapping period)
   - Managed workplace safety, OSHA adherence, and emergency response planning.
   - Handled computer operation and data entry for safety logs and incident registers.
`.trim();

const structuredHseCandidate: CandidateResumeExtraction = {
  candidateName: "Muhammad Ahmed",
  email: "ahmed.safety@example.com",
  phone: "+92 300 1234567",
  location: "Karachi, Pakistan",
  summary: "Dedicated HSE & Safety Officer with NEBOSH, OSHA, and IOSH certifications.",
  skills: [
    "NEBOSH",
    "OSHA",
    "HSE",
    "IOSH",
    "Computer Operator",
    "Data Entry",
    "Technical Skills",
    "Safety and Health",
    "MS Office",
  ],
  normalizedSkills: ["nebosh", "osha", "hse", "iosh", "computer operator", "data entry"],
  experience: [
    {
      jobTitle: "HSE Officer",
      company: "ABC Builders Ltd",
      startDate: "2019-01-01",
      endDate: "2021-12-31",
      isCurrent: false,
      description: "Supervised site safety, conducted tool-box talks, and ensured NEBOSH compliance.",
      skillsUsed: ["HSE", "NEBOSH", "Safety"],
      durationYears: 3,
    },
    {
      jobTitle: "Safety Coordinator",
      company: "XYZ Industrial Solutions",
      startDate: "2021-01-01",
      endDate: "2024-12-31",
      isCurrent: false,
      description: "Managed workplace safety, OSHA adherence, and data entry for safety logs.",
      skillsUsed: ["OSHA", "Safety", "Data Entry", "Computer Operator"],
      durationYears: 4,
    },
  ],
  education: [
    {
      institution: "Govt Polytechnic Institute",
      degree: "DAE Mechanical Engineering",
      fieldOfStudy: "Mechanical Engineering",
      graduationYear: "2018",
      isCompleted: true,
      academicStatus: "GRADUATED",
    },
    {
      institution: "Board of Intermediate Education",
      degree: "Intermediate in Pre-Engineering",
      fieldOfStudy: "Pre-Engineering",
      graduationYear: "2015",
      isCompleted: true,
      academicStatus: "GRADUATED",
    },
  ],
  projects: [],
  certifications: [
    {
      name: "NEBOSH (The National Examination Board in Occupational Safety & Health UK)",
      issuer: "NEBOSH UK",
      year: "2022",
    },
    {
      name: "OSHA (Occupational Safety and Health Administration 30 Hours)",
      issuer: "OSHA",
      year: "2024",
    },
    {
      name: "IOSH (Managing Safely)",
      issuer: "IOSH",
      year: "2021",
    },
  ],
  languages: ["English", "Urdu"],
  totalExperienceYears: 6,
  highestDegree: "DAE Mechanical Engineering",
};

async function runResumeAccuracyTests() {
  console.log("\n=======================================================");
  console.log("RUNNING RESUME ACCURACY & DIRECT EVIDENCE TESTS");
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
  // Test 1: NEBOSH Direct Extraction & Matching
  // -------------------------------------------------------------
  const neboshRes = matchRequirementAgainstResume(
    { title: "NEBOSH", type: "CERTIFICATION" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    neboshRes.status === "MATCHED",
    "Test 1: NEBOSH matches as MATCHED",
    `Got status: ${neboshRes.status}`
  );
  assert(
    neboshRes.evidenceQuote?.includes("NEBOSH") === true,
    "Test 1b: NEBOSH evidence quote contains verbatim line",
    `Quote: ${neboshRes.evidenceQuote}`
  );
  assert(
    neboshRes.confidence >= 0.95,
    "Test 1c: NEBOSH confidence >= 0.95",
    `Confidence: ${neboshRes.confidence}`
  );

  // -------------------------------------------------------------
  // Test 2: OSHA Direct Extraction & Matching
  // -------------------------------------------------------------
  const oshaRes = matchRequirementAgainstResume(
    { title: "OSHA", type: "CERTIFICATION" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    oshaRes.status === "MATCHED",
    "Test 2: OSHA matches as MATCHED",
    `Got status: ${oshaRes.status}`
  );
  assert(
    oshaRes.evidenceQuote?.includes("OSHA") === true,
    "Test 2b: OSHA evidence quote contains verbatim line",
    `Quote: ${oshaRes.evidenceQuote}`
  );

  // -------------------------------------------------------------
  // Test 3: HSE Direct Extraction & Matching
  // -------------------------------------------------------------
  const hseRes = matchRequirementAgainstResume(
    { title: "HSE", type: "SKILL" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    hseRes.status === "MATCHED",
    "Test 3: HSE matches as MATCHED",
    `Got status: ${hseRes.status}`
  );

  // -------------------------------------------------------------
  // Test 4: IOSH Direct Extraction & Matching
  // -------------------------------------------------------------
  const ioshRes = matchRequirementAgainstResume(
    { title: "IOSH", type: "CERTIFICATION" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    ioshRes.status === "MATCHED",
    "Test 4: IOSH matches as MATCHED",
    `Got status: ${ioshRes.status}`
  );

  // -------------------------------------------------------------
  // Test 5: Computer Operator & Data Entry Matching
  // -------------------------------------------------------------
  const compOpRes = matchRequirementAgainstResume(
    { title: "Computer Operator", type: "SKILL" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    compOpRes.status === "MATCHED",
    "Test 5: Computer Operator matches as MATCHED",
    `Got status: ${compOpRes.status}`
  );

  const dataEntryRes = matchRequirementAgainstResume(
    { title: "Data Entry", type: "SKILL" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    dataEntryRes.status === "MATCHED",
    "Test 5b: Data Entry matches as MATCHED",
    `Got status: ${dataEntryRes.status}`
  );

  // -------------------------------------------------------------
  // Test 6: Semantic Skills (Computer Skills & Safety and Health)
  // -------------------------------------------------------------
  const compSkillsRes = matchRequirementAgainstResume(
    { title: "Computer Skills", type: "SKILL" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    compSkillsRes.status === "MATCHED",
    "Test 6: Computer Skills matches as MATCHED via related evidence",
    `Got status: ${compSkillsRes.status}`
  );

  const safetyHealthRes = matchRequirementAgainstResume(
    { title: "Safety and Health", type: "SKILL" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    safetyHealthRes.status === "MATCHED",
    "Test 6b: Safety and Health matches as MATCHED via related evidence",
    `Got status: ${safetyHealthRes.status}`
  );

  // -------------------------------------------------------------
  // Test 7: DAE = DIPLOMA (Rank 3) & Education Hierarchy
  // -------------------------------------------------------------
  const daeNorm = normalizeRequirement("DAE");
  assert(
    daeNorm.requiredDegreeRank === 3,
    "Test 7: DAE normalized degree rank is 3 (DIPLOMA)",
    `Rank: ${daeNorm.requiredDegreeRank}`
  );

  const bachelorReqRes = matchRequirementAgainstResume(
    { title: "Bachelor's Degree", type: "EDUCATION" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    bachelorReqRes.status === "NOT_FOUND",
    "Test 7b: Bachelor's degree is NOT_FOUND for DAE holder",
    `Got status: ${bachelorReqRes.status}`
  );

  const masterReqRes = matchRequirementAgainstResume(
    { title: "Master's Degree", type: "EDUCATION" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    masterReqRes.status === "NOT_FOUND",
    "Test 7c: Master's degree is NOT_FOUND for DAE holder",
    `Got status: ${masterReqRes.status}`
  );

  // -------------------------------------------------------------
  // Test 8: Unmentioned Skills Return NOT_FOUND (No Hallucinations)
  // -------------------------------------------------------------
  const pythonRes = matchRequirementAgainstResume(
    { title: "Python", type: "SKILL" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    pythonRes.status === "NOT_FOUND",
    "Test 8: Python is NOT_FOUND when not in resume",
    `Got status: ${pythonRes.status}`
  );

  const awsRes = matchRequirementAgainstResume(
    { title: "AWS", type: "SKILL" },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    awsRes.status === "NOT_FOUND",
    "Test 8b: AWS is NOT_FOUND when not in resume",
    `Got status: ${awsRes.status}`
  );

  // -------------------------------------------------------------
  // Test 9: Merged Overlapping Experience Calculation
  // -------------------------------------------------------------
  const mergedYears = calculateMergedExperienceYears(structuredHseCandidate.experience);
  assert(
    mergedYears >= 5.8 && mergedYears <= 6.2,
    `Test 9: Merged overlapping experience correctly calculated as 6.0 yrs (not 3+4=7)`,
    `Calculated: ${mergedYears} yrs`
  );

  const exp5YearsRes = matchRequirementAgainstResume(
    { title: "5 years experience", type: "EXPERIENCE", minimumValue: 5 },
    sampleHseResumeText,
    structuredHseCandidate
  );
  assert(
    exp5YearsRes.status === "MATCHED",
    "Test 9b: 5 years experience requirement is MATCHED with 6 yrs merged",
    `Got status: ${exp5YearsRes.status}`
  );

  console.log(`\n=======================================================`);
  console.log(`ALL ${passed}/${total} RESUME ACCURACY TESTS PASSED!`);
  console.log(`=======================================================\n`);
}

runResumeAccuracyTests().catch((err) => {
  console.error("Resume accuracy tests failed:", err);
  process.exit(1);
});
