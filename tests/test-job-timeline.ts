import connectToDatabase from "../lib/db/mongodb";
import Job from "../models/Job";
import Company from "../models/Company";
import { Types } from "mongoose";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

async function testJobTimeline() {
  process.loadEnvFile(".env");
  await connectToDatabase();

  console.log("===============================================================");
  console.log(" ⏳ JOB TIMELINE & 404 / CLOSED APPLICATION TEST SUITE");
  console.log("===============================================================\n");

  const companyId = new Types.ObjectId();

  // Test 1: Active job with future deadline
  console.log("=== [1] Active Job with Future Deadline ===");
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 14); // 14 days in future

  const activeJob = await Job.create({
    companyId,
    title: "Active Frontend Engineer",
    slug: `test-active-${Date.now()}`,
    description: "Active job description",
    status: "PUBLISHED",
    applicationDeadline: futureDate,
  });

  const now = new Date();
  const isActiveClosed = activeJob.status !== "PUBLISHED" || (activeJob.applicationDeadline && new Date(activeJob.applicationDeadline) < now);
  assert(!isActiveClosed, "Future deadline job is open and accepting applications");

  // Test 2: Expired job with past deadline
  console.log("\n=== [2] Expired Job with Past Deadline ===");
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 2); // 2 days in past

  const expiredJob = await Job.create({
    companyId,
    title: "Expired Mobile Engineer",
    slug: `test-expired-${Date.now()}`,
    description: "Expired job description",
    status: "PUBLISHED",
    applicationDeadline: pastDate,
  });

  const isExpiredClosed = expiredJob.status !== "PUBLISHED" || (expiredJob.applicationDeadline && new Date(expiredJob.applicationDeadline) < now);
  assert(Boolean(isExpiredClosed), "Past deadline job correctly flags isClosed = true");

  // Test 3: Deleted / Non-existent job
  console.log("\n=== [3] Deleted / Non-existent Job Slug ===");
  const nonExistentSlug = `non-existent-${Date.now()}`;
  const foundJob = await Job.findOne({ slug: nonExistentSlug });
  assert(!foundJob, "Non-existent or deleted job correctly evaluates to null (404)");

  // Clean up
  await Job.findByIdAndDelete(activeJob._id);
  await Job.findByIdAndDelete(expiredJob._id);
  console.log("\nCleaned up test documents.");

  console.log("\n===============================================================");
  console.log(" ✅ ALL JOB TIMELINE TESTS PASSED SUCCESSFULLY!");
  console.log("===============================================================");
  process.exit(0);
}

testJobTimeline().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
