import { validateDocumentFile } from "../lib/storage/file-parser";
import {
  generateSubmissionFingerprint,
  checkIdempotency,
  recordIdempotency,
} from "../lib/security/idempotency";
import { checkRateLimit } from "../lib/security/rate-limit";

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

async function runPhase5Tests() {
  console.log("=== Running Phase 5 Verification Tests ===\n");

  // 1. Rate Limiter on Application Submissions
  console.log("[1] Testing Rate Limiting on Application Ingestion");
  const testCandidateIp = "192.168.1.100";
  const rateLimitOpts = { intervalMs: 60000, maxRequests: 2 };
  const req1 = checkRateLimit(testCandidateIp, rateLimitOpts);
  const req2 = checkRateLimit(testCandidateIp, rateLimitOpts);
  const req3 = checkRateLimit(testCandidateIp, rateLimitOpts);
  assert(req1.success && req1.remaining === 1, "First submission allowed with remaining 1");
  assert(req2.success && req2.remaining === 0, "Second submission allowed with remaining 0");
  assert(!req3.success && req3.remaining === 0, "Third submission blocked (rate limited)");

  // 2. Resume File Format & Size Validation
  console.log("\n[2] Testing Candidate Resume Upload Validation");
  const pdfBuffer = Buffer.from("%PDF-1.5 test content for resume document upload");
  const pdfVal = validateDocumentFile(pdfBuffer, "my_resume.pdf", "application/pdf");
  assert(pdfVal.isValid && pdfVal.format === "pdf", "PDF upload passes validation");

  const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
  const oversizeVal = validateDocumentFile(oversizedBuffer, "large.pdf", "application/pdf");
  assert(!oversizeVal.isValid && oversizeVal.error?.includes("10MB"), "Oversized file (>10MB) is rejected");

  // 3. Idempotency on Fast Retries
  console.log("\n[3] Testing Fast Network Retry Idempotency");
  const key = generateSubmissionFingerprint("job-999", "applicant@test.com", "resume.pdf", 4096);
  assert(checkIdempotency(key) === null, "New submission is not in idempotency cache");
  recordIdempotency(key, { success: true, referenceNumber: "APP-REF-1234" });
  const cached = checkIdempotency(key);
  assert(cached && cached.referenceNumber === "APP-REF-1234", "Retried submission retrieves cached reference without duplicate processing");

  console.log(`\n=========================================`);
  console.log(`Phase 5 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`=========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
