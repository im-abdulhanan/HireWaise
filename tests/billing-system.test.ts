import fs from "fs";
import path from "path";

// Load .env / .env.local file
for (const envFile of [".env.local", ".env"]) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const idx = trimmed.indexOf("=");
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import mongoose, { Types } from "mongoose";
import connectToDatabase from "../lib/db/mongodb";
import Company from "../models/Company";
import Job from "../models/Job";
import {
  SUBSCRIPTION_PLANS,
  getPlanConfig,
  getLimitExceededMessage,
} from "../lib/billing/plans";
import {
  getCompanySubscription,
  getCompanyJobUsage,
  assertCanCreateJob,
  consumeJobQuotaAtomic,
  releaseJobQuotaAtomic,
  upgradeCompanyPlan,
  downgradeCompanyPlan,
} from "../lib/billing/subscription";

async function runBillingTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING SUBSCRIPTION MONTHLY JOB QUOTA TESTS");
  console.log("==================================================\n");

  await connectToDatabase();

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      testPassed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      testFailed++;
    }
  }

  // --- TEST SUITE 1: Centralized Configuration ---
  console.log("📋 Test Suite 1: Centralized Plan Configuration");
  assert(
    SUBSCRIPTION_PLANS.FREE.monthlyJobLimit === 2 && SUBSCRIPTION_PLANS.FREE.price === 0,
    "FREE plan configured with exactly 2 jobs/month at $0/mo"
  );
  assert(
    SUBSCRIPTION_PLANS.PRO.monthlyJobLimit === 50 && SUBSCRIPTION_PLANS.PRO.price === 10,
    "PRO plan configured with exactly 50 jobs/month at $10/mo"
  );
  assert(
    getPlanConfig("FREE").monthlyJobLimit === 2,
    "getPlanConfig('FREE') returns 2 jobs limit"
  );
  assert(
    getPlanConfig("PRO").monthlyJobLimit === 50,
    "getPlanConfig('PRO') returns 50 jobs limit"
  );
  assert(
    getLimitExceededMessage("FREE").includes("You've used all 2 job postings available on your Free plan. Upgrade to Pro for up to 50 job postings per month."),
    "Limit exceeded message matches required copy"
  );

  // --- TEST SUITE 2: Company Subscription Initialization ---
  console.log("\n🏢 Test Suite 2: Company Creation & Default Free Subscription");
  const testCompanySlug = `quota-test-${Date.now()}`;
  const testCompany = await Company.create({
    name: "Quota Test Corp",
    slug: testCompanySlug,
    settings: {
      retentionDays: 365,
      allowPublicApplications: true,
      autoSyncSheets: true,
    },
  });

  const sub = await getCompanySubscription(testCompany._id);
  assert(
    sub.subscription?.plan === "FREE",
    "New company auto-initialized with 'FREE' plan"
  );
  assert(
    sub.subscription?.status === "ACTIVE",
    "New company subscription status is 'ACTIVE'"
  );
  assert(
    Boolean(sub.subscription?.currentPeriodStart && sub.subscription?.currentPeriodEnd),
    "Billing period start and end dates generated properly"
  );

  let usage = await getCompanyJobUsage(testCompany._id);
  assert(
    usage.jobsUsed === 0 && usage.jobsRemaining === 2 && usage.canCreateJob === true,
    "Initial usage shows 0/2 used, 2 remaining, canCreateJob = true"
  );

  // --- TEST SUITE 3: Atomic Quota Consumption & Job Limit Enforcement ---
  console.log("\n🔒 Test Suite 3: Atomic Quota Consumption (2/2 Free)");

  // 1st Job creation quota consumption
  const quota1 = await consumeJobQuotaAtomic(testCompany._id);
  assert(
    quota1.allowed === true && quota1.usage.jobsUsed === 1 && quota1.usage.jobsRemaining === 1,
    "1st job quota reservation: 1/2 used, 1 remaining, allowed = true"
  );

  const job1 = await Job.create({
    companyId: testCompany._id,
    title: "Quota Test Job 1",
    slug: `${testCompanySlug}-job-1`,
    description: "Test description 1",
    status: "PUBLISHED",
    workplaceType: "REMOTE",
    employmentType: "FULL_TIME",
  });

  // 2nd Job creation quota consumption
  const quota2 = await consumeJobQuotaAtomic(testCompany._id);
  assert(
    quota2.allowed === true && quota2.usage.jobsUsed === 2 && quota2.usage.jobsRemaining === 0,
    "2nd job quota reservation: 2/2 used, 0 remaining, allowed = true"
  );

  const job2 = await Job.create({
    companyId: testCompany._id,
    title: "Quota Test Job 2",
    slug: `${testCompanySlug}-job-2`,
    description: "Test description 2",
    status: "PUBLISHED",
    workplaceType: "REMOTE",
    employmentType: "FULL_TIME",
  });

  // 3rd Job creation attempt (Must be strictly rejected)
  const quota3 = await consumeJobQuotaAtomic(testCompany._id);
  assert(
    quota3.allowed === false,
    "3rd job creation strictly rejected when 2/2 quota reached"
  );
  assert(
    quota3.reason ===
      "Monthly job limit reached. You've used all 2 job postings available on your Free plan. Upgrade to Pro for up to 50 job postings per month.",
    "Rejection reason matches required copy exactly"
  );

  // --- TEST SUITE 4: Job Deletion Must NEVER Decrement Quota ---
  console.log("\n🗑️ Test Suite 4: Deleting a Job Does NOT Restore Quota");

  // Delete Job 1
  await Job.findByIdAndDelete(job1._id);

  // Verify usage remains 2/2
  usage = await getCompanyJobUsage(testCompany._id);
  assert(
    usage.jobsUsed === 2 && usage.jobsRemaining === 0 && usage.canCreateJob === false,
    "After deleting job: Quota remains 2/2 used, 0 remaining, canCreateJob = false"
  );

  // Attempt creating another job after deletion
  const quotaAfterDelete = await consumeJobQuotaAtomic(testCompany._id);
  assert(
    quotaAfterDelete.allowed === false,
    "Creation still rejected after deleting a job (quota is NOT restored)"
  );

  // --- TEST SUITE 5: Concurrent Job Creation Race Condition Protection ---
  console.log("\n⚡ Test Suite 5: Concurrent Requests Race Condition Protection");
  const concurrentCompanySlug = `concurrent-test-${Date.now()}`;
  const concurrentCompany = await Company.create({
    name: "Concurrent Test Corp",
    slug: concurrentCompanySlug,
    settings: { retentionDays: 365, allowPublicApplications: true, autoSyncSheets: true },
  });
  await getCompanySubscription(concurrentCompany._id);

  // Fire 5 concurrent requests simultaneously on a 2-limit Free plan
  const concurrentResults = await Promise.all([
    consumeJobQuotaAtomic(concurrentCompany._id),
    consumeJobQuotaAtomic(concurrentCompany._id),
    consumeJobQuotaAtomic(concurrentCompany._id),
    consumeJobQuotaAtomic(concurrentCompany._id),
    consumeJobQuotaAtomic(concurrentCompany._id),
  ]);

  const successfulReservations = concurrentResults.filter((r) => r.allowed === true);
  const rejectedReservations = concurrentResults.filter((r) => r.allowed === false);

  assert(
    successfulReservations.length === 2,
    `Exactly 2 of 5 concurrent requests succeeded (${successfulReservations.length} allowed)`
  );
  assert(
    rejectedReservations.length === 3,
    `Exactly 3 of 5 concurrent requests were rejected (${rejectedReservations.length} rejected)`
  );

  const concurrentUsage = await getCompanyJobUsage(concurrentCompany._id);
  assert(
    concurrentUsage.jobsUsed === 2 && concurrentUsage.jobsRemaining === 0,
    "Concurrent usage strictly capped at 2/2"
  );

  // --- TEST SUITE 6: Pro Plan Upgrade (Preserving Consumed Quota) ---
  console.log("\n🚀 Test Suite 6: Free -> Pro Upgrade (Preserves Consumed Quota)");
  const upgradedUsage = await upgradeCompanyPlan(testCompany._id, "PRO");
  assert(
    upgradedUsage.plan === "PRO" && upgradedUsage.jobsLimit === 50,
    "Company successfully upgraded to PRO tier (limit = 50)"
  );
  assert(
    upgradedUsage.jobsUsed === 2 && upgradedUsage.jobsRemaining === 48,
    "Consumed quota preserved: 2/50 used, 48 remaining available"
  );
  assert(
    upgradedUsage.canCreateJob === true,
    "canCreateJob is true under expanded Pro tier"
  );

  // Consume another quota on Pro plan
  const proQuota = await consumeJobQuotaAtomic(testCompany._id);
  assert(
    proQuota.allowed === true && proQuota.usage.jobsUsed === 3 && proQuota.usage.jobsRemaining === 47,
    "Pro tier consumes 3rd job: 3/50 used, 47 remaining"
  );

  // --- TEST SUITE 7: Pro -> Free Downgrade (Preserving Consumed Quota) ---
  console.log("\n🔄 Test Suite 7: Downgrade back to Free Plan");
  const downgradedUsage = await downgradeCompanyPlan(testCompany._id);
  assert(
    downgradedUsage.plan === "FREE" && downgradedUsage.jobsLimit === 2,
    "Downgrade switches company back to FREE tier (limit = 2)"
  );
  assert(
    downgradedUsage.jobsUsed === 3 && downgradedUsage.jobsRemaining === 0 && downgradedUsage.canCreateJob === false,
    "Since 3 jobs were consumed, usage is 3/2, 0 remaining, canCreateJob = false"
  );

  // --- TEST SUITE 8: Monthly Cycle Expiration & Quota Auto-Reset ---
  console.log("\n⏰ Test Suite 8: Monthly Usage Period Roll-Forward & Reset");

  // Fast forward testCompany's periodEnd to the past
  await Company.updateOne(
    { _id: testCompany._id },
    {
      $set: {
        "subscription.currentPeriodEnd": new Date(Date.now() - 1000 * 60), // 1 min ago
      },
    }
  );

  // Verify that accessing usage rolls forward period and resets jobsUsedThisPeriod to 0
  const resetUsage = await getCompanyJobUsage(testCompany._id);
  assert(
    resetUsage.jobsUsed === 0 && resetUsage.jobsRemaining === 2 && resetUsage.canCreateJob === true,
    "After monthly period expires: Quota automatically resets to 0/2, 2 remaining"
  );
  assert(
    new Date(resetUsage.currentPeriodEnd) > new Date(),
    "New 30-day billing period generated into the future"
  );

  // Consume after reset
  const postResetQuota = await consumeJobQuotaAtomic(testCompany._id);
  assert(
    postResetQuota.allowed === true && postResetQuota.usage.jobsUsed === 1,
    "Job creation succeeds under fresh monthly period: 1/2 used"
  );

  // Cleanup test resources
  console.log("\n🧹 Cleaning up test database fixtures...");
  await Job.deleteMany({ companyId: { $in: [testCompany._id, concurrentCompany._id] } });
  await Company.deleteMany({ _id: { $in: [testCompany._id, concurrentCompany._id] } });

  console.log("\n==================================================");
  console.log(`📊 TEST RESULTS: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("==================================================");

  if (testFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runBillingTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
