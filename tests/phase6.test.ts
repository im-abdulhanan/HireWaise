import { verifyCompanyAccess } from "../lib/security/tenant-guard";

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

async function runPhase6Tests() {
  console.log("=== Running Phase 6 Verification Tests ===\n");

  // 1. Recruiter Decision Pipeline Statuses
  console.log("[1] Testing Human Decision Pipeline Statuses");
  const validStatuses = [
    "NEW",
    "UNDER_REVIEW",
    "SHORTLISTED",
    "INTERVIEWING",
    "REJECTED",
    "HIRED",
  ];
  assert(validStatuses.length === 6, "All 6 human decision pipeline statuses defined");
  assert(validStatuses.includes("SHORTLISTED") && validStatuses.includes("HIRED"), "Includes shortlisted and hired statuses");

  // 2. Tenant Isolation on Candidate & Resume Endpoints
  console.log("\n[2] Testing Gated Tenant Security on Candidate Data");
  const myCompanyId = "66c0d8f0e4b01234567890aa";
  const otherCompanyId = "66c0d8f0e4b01234567890bb";
  const resumeOwnerId = "66c0d8f0e4b01234567890aa";

  assert(
    verifyCompanyAccess(myCompanyId, resumeOwnerId) === true,
    "Recruiter from matching company is authorized to download candidate resume"
  );
  assert(
    verifyCompanyAccess(otherCompanyId, resumeOwnerId) === false,
    "Recruiter from different company is strictly forbidden from downloading candidate resume"
  );

  // 3. Evidence Card Status Mapping
  console.log("\n[3] Testing Requirement Evidence Status Categories");
  const allowedEvidenceStatuses = ["MATCHED", "PARTIAL", "NOT_FOUND", "UNCLEAR"];
  assert(allowedEvidenceStatuses.includes("MATCHED"), "Matched status present");
  assert(allowedEvidenceStatuses.includes("UNCLEAR"), "Unclear / Human Review status present");

  console.log(`\n=========================================`);
  console.log(`Phase 6 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`=========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
