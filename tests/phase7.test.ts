import {
  SCREENING_SHEET_HEADERS,
  formatCandidateRowForSheet,
  CandidateSheetRowData,
} from "../lib/google/sheets";
import { encryptToken, decryptToken } from "../lib/security/encryption";

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

async function runPhase7Tests() {
  console.log("=== Running Phase 7 Verification Tests ===\n");

  // 1. 17-Column Professional Google Sheets Header Standard
  console.log("[1] Testing 17-Column Header Standard");
  assert(SCREENING_SHEET_HEADERS.length === 17, "Header list contains exactly 17 columns");
  assert(SCREENING_SHEET_HEADERS[0] === "Candidate ID", "Column 1 is 'Candidate ID'");
  assert(SCREENING_SHEET_HEADERS[4] === "Match Score", "Column 5 is 'Match Score'");
  assert(SCREENING_SHEET_HEADERS[5] === "AI Screening Category", "Column 6 is 'AI Screening Category'");
  assert(SCREENING_SHEET_HEADERS[13] === "Recruiter Status", "Column 14 is 'Recruiter Status'");
  assert(SCREENING_SHEET_HEADERS[16] === "Screening Version", "Column 17 is 'Screening Version'");

  // 2. Candidate Row Formatter Transformation
  console.log("\n[2] Testing Candidate Row Formatter");
  const testCandidateData: CandidateSheetRowData = {
    applicationId: "APP-A1B2C3D4",
    candidateName: "Elena Rostova",
    email: "elena@example.com",
    jobTitle: "Staff Backend Engineer",
    matchScore: 94,
    aiCategory: "Strong Match",
    requiredSkillsMatched: "Node.js, PostgreSQL, Distributed Systems",
    requiredSkillsMissing: "None",
    preferredSkillsMatched: "Docker, Kubernetes",
    experienceYears: "6.5 yrs",
    education: "Master of Science in Computer Science (MIT)",
    evidenceSummary: "Exceeds all technical requirements with 6.5 years experience.",
    confidence: "96%",
    recruiterStatus: "SHORTLISTED",
    submittedAt: "Aug 17, 2026, 10:30 AM",
    lastScreenedAt: "Aug 17, 2026, 10:31 AM",
    screeningVersion: "v1",
  };

  const row = formatCandidateRowForSheet(testCandidateData);
  assert(row.length === 17, "Formatted spreadsheet row has exactly 17 elements");
  assert(row[0] === "APP-A1B2C3D4", "Formatted row starts with Candidate ID");
  assert(row[4] === "94/100", "Match score formatted as 94/100");
  assert(row[13] === "SHORTLISTED", "Recruiter status correctly placed in Column 14");
  assert(row[16] === "v1", "Screening version correctly placed in Column 17");

  // 3. OAuth Token Encryption for Google APIs
  console.log("\n[3] Testing OAuth Token Encryption Security");
  const sampleGoogleAccessToken = "ya29.a0ARrdaM8sampleTokenString123456789";
  const sampleRefreshToken = "1//04sampleRefreshTokenXYZ987654321";

  const encAccess = encryptToken(sampleGoogleAccessToken);
  const encRefresh = encryptToken(sampleRefreshToken);

  assert(encAccess !== sampleGoogleAccessToken, "Access token is encrypted");
  assert(encRefresh !== sampleRefreshToken, "Refresh token is encrypted");

  const decAccess = decryptToken(encAccess);
  const decRefresh = decryptToken(encRefresh);

  assert(decAccess === sampleGoogleAccessToken, "Decrypted access token matches original");
  assert(decRefresh === sampleRefreshToken, "Decrypted refresh token matches original");

  console.log(`\n=========================================`);
  console.log(`Phase 7 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`=========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase7Tests().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
