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
  upgradeCompanyPlan,
  downgradeCompanyPlan,
} from "../lib/billing/subscription";

async function runBillingTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING PRODUCTION BILLING & USAGE SYSTEM TESTS");
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
    getLimitExceededMessage().includes("Upgrade to Pro to create up to 50 jobs"),
    "Limit exceeded message matches standard copy"
  );

  // --- TEST SUITE 2: Company Subscription & Usage Engine ---
  console.log("\n🏢 Test Suite 2: Company Creation & Default Free Subscription");
  const testCompanySlug = `billing-test-${Date.now()}`;
  const testCompany = await Company.create({
    name: "Billing Test Corp",
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

  // --- TEST SUITE 3: Server-side Job Limit Enforcement ---
  console.log("\n🔒 Test Suite 3: Server-Side Job Limit Validation");

  // Create Job 1
  const job1 = await Job.create({
    companyId: testCompany._id,
    title: "Billing Test Job 1",
    slug: `${testCompanySlug}-job-1`,
    description: "Test description 1",
    status: "PUBLISHED",
    workplaceType: "REMOTE",
    employmentType: "FULL_TIME",
  });

  usage = await getCompanyJobUsage(testCompany._id);
  assert(
    usage.jobsUsed === 1 && usage.jobsRemaining === 1 && usage.canCreateJob === true,
    "After 1st job: 1/2 used, 1 remaining, canCreateJob = true"
  );

  let check = await assertCanCreateJob(testCompany._id);
  assert(check.allowed === true, "assertCanCreateJob allows 2nd job creation");

  // Create Job 2
  const job2 = await Job.create({
    companyId: testCompany._id,
    title: "Billing Test Job 2",
    slug: `${testCompanySlug}-job-2`,
    description: "Test description 2",
    status: "PUBLISHED",
    workplaceType: "REMOTE",
    employmentType: "FULL_TIME",
  });

  usage = await getCompanyJobUsage(testCompany._id);
  assert(
    usage.jobsUsed === 2 && usage.jobsRemaining === 0 && usage.canCreateJob === false,
    "After 2nd job: 2/2 used, 0 remaining, canCreateJob = false"
  );

  // Check 3rd job creation attempt
  check = await assertCanCreateJob(testCompany._id);
  assert(
    check.allowed === false,
    "assertCanCreateJob strictly rejects 3rd job creation on Free Plan"
  );
  assert(
    Boolean(check.reason && check.reason.includes("Upgrade to Pro")),
    "Rejection reason contains upgrade guidance to Pro tier"
  );

  // --- TEST SUITE 4: Plan Upgrade & Limit Expansion ---
  console.log("\n⚡ Test Suite 4: Pro Plan Upgrade & Limit Expansion");
  const upgradedUsage = await upgradeCompanyPlan(testCompany._id, "PRO");
  assert(
    upgradedUsage.plan === "PRO",
    "Company successfully upgraded to 'PRO' plan"
  );
  assert(
    upgradedUsage.jobsLimit === 50,
    "Monthly limit expanded from 2 to 50 jobs"
  );
  assert(
    upgradedUsage.jobsUsed === 2 && upgradedUsage.jobsRemaining === 48 && upgradedUsage.canCreateJob === true,
    "Usage recalculates: 2/50 used, 48 remaining, canCreateJob = true"
  );

  const proCheck = await assertCanCreateJob(testCompany._id);
  assert(
    proCheck.allowed === true,
    "assertCanCreateJob now permits creating additional jobs under Pro tier"
  );

  // --- TEST SUITE 5: Plan Downgrade ---
  console.log("\n🔄 Test Suite 5: Downgrade back to Free Plan");
  const downgradedUsage = await downgradeCompanyPlan(testCompany._id);
  assert(
    downgradedUsage.plan === "FREE" && downgradedUsage.jobsLimit === 2,
    "Downgrade switches company back to FREE tier (limit = 2)"
  );
  assert(
    downgradedUsage.canCreateJob === false,
    "Since 2 jobs already exist, canCreateJob immediately returns false on Free tier"
  );

  // Cleanup test resources
  console.log("\n🧹 Cleaning up test database fixtures...");
  await Job.deleteMany({ companyId: testCompany._id });
  await Company.findByIdAndDelete(testCompany._id);

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
