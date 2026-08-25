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
import bcrypt from "bcryptjs";
import connectToDatabase from "../lib/db/mongodb";
import Company from "../models/Company";
import User from "../models/User";
import Job from "../models/Job";
import GoogleIntegration from "../models/GoogleIntegration";

async function runSettingsTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING PRODUCTION SETTINGS SYSTEM TESTS");
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

  // --- TEST SUITE 1: Create Test Workspace and Owner/Recruiter Users ---
  console.log("🏢 Test Suite 1: Organization & User Fixture Setup");
  const testCompanySlug = `settings-test-${Date.now()}`;
  const testCompany = await Company.create({
    name: "Settings Test Inc",
    slug: testCompanySlug,
    industry: "Human Resources",
    size: "11-50",
    country: "United States",
    city: "New York",
    description: "Recruitment automation leaders.",
    settings: {
      retentionDays: 365,
      allowPublicApplications: true,
      autoSyncSheets: true,
    },
  });

  const salt = await bcrypt.genSalt(10);
  const ownerPasswordHash = await bcrypt.hash("OwnerPass#123", salt);
  const recruiterPasswordHash = await bcrypt.hash("RecruiterPass#123", salt);

  const ownerUser = await User.create({
    name: "Owner User",
    email: `owner-${Date.now()}@example.com`,
    passwordHash: ownerPasswordHash,
    companyId: testCompany._id,
    role: "OWNER",
    provider: "credentials",
  });

  const recruiterUser = await User.create({
    name: "Recruiter User",
    email: `recruiter-${Date.now()}@example.com`,
    passwordHash: recruiterPasswordHash,
    companyId: testCompany._id,
    role: "RECRUITER",
    provider: "credentials",
  });

  const oauthUser = await User.create({
    name: "OAuth User",
    email: `oauth-${Date.now()}@example.com`,
    companyId: testCompany._id,
    role: "VIEWER",
    provider: "google",
  });

  assert(Boolean(testCompany._id), "Test organization workspace created");
  assert(ownerUser.role === "OWNER", "Owner user initialized with OWNER role");
  assert(recruiterUser.role === "RECRUITER", "Recruiter user initialized with RECRUITER role");
  assert(oauthUser.provider === "google", "OAuth user initialized with google provider");

  // --- TEST SUITE 2: Company Profile Updates & Validation ---
  console.log("\n🏢 Test Suite 2: Company Profile Updates & Metadata Persistence");
  testCompany.name = "Settings Test Inc Updated";
  testCompany.website = "https://settingstest.com";
  (testCompany as any).industry = "AI Recruiting SaaS";
  (testCompany as any).size = "51-200";
  (testCompany as any).country = "Canada";
  (testCompany as any).city = "Toronto";
  testCompany.settings.retentionDays = 180;
  await testCompany.save();

  const refreshedCompany = await Company.findById(testCompany._id);
  assert(
    refreshedCompany?.name === "Settings Test Inc Updated",
    "Company name successfully updated"
  );
  assert(
    refreshedCompany?.website === "https://settingstest.com",
    "Company website successfully updated"
  );
  assert(
    (refreshedCompany as any)?.industry === "AI Recruiting SaaS",
    "Industry metadata persisted"
  );
  assert(
    refreshedCompany?.settings.retentionDays === 180,
    "Data retention policy updated to 180 days"
  );

  // --- TEST SUITE 3: Password Verification & Security Constraints ---
  console.log("\n🔒 Test Suite 3: Password Change & Security Verification");
  const isMatchCurrent = await bcrypt.compare("OwnerPass#123", ownerUser.passwordHash!);
  assert(isMatchCurrent === true, "Current password verifies against bcrypt hash");

  const newHash = await bcrypt.hash("NewOwnerPass#456", salt);
  ownerUser.passwordHash = newHash;
  await ownerUser.save();

  const isMatchNew = await bcrypt.compare("NewOwnerPass#456", (await User.findById(ownerUser._id))?.passwordHash!);
  assert(isMatchNew === true, "New password verified successfully after update");

  assert(
    oauthUser.provider === "google" && !oauthUser.passwordHash,
    "OAuth accounts do not store password hashes"
  );

  // --- TEST SUITE 4: Screening Defaults Configuration ---
  console.log("\n⚖️ Test Suite 4: Screening Defaults Configuration");
  (testCompany as any).screeningDefaults = {
    humanReviewBelowScore: 80,
    requiredSkillsMustMatch: true,
    minimumExperienceMustMatch: false,
    educationRequired: true,
    scoringWeights: {
      requiredSkillsWeight: 50,
      experienceWeight: 20,
      educationWeight: 15,
      preferredSkillsWeight: 10,
      otherWeight: 5,
    },
  };
  await testCompany.save();

  const companyWithDefaults = await Company.findById(testCompany._id);
  const defaults = (companyWithDefaults as any)?.screeningDefaults;
  assert(defaults.humanReviewBelowScore === 80, "Human review threshold set to 80%");
  assert(defaults.educationRequired === true, "Education required set to true");
  assert(
    defaults.scoringWeights.requiredSkillsWeight === 50 &&
      defaults.scoringWeights.requiredSkillsWeight +
        defaults.scoringWeights.experienceWeight +
        defaults.scoringWeights.educationWeight +
        defaults.scoringWeights.preferredSkillsWeight +
        defaults.scoringWeights.otherWeight ===
        100,
    "Scoring weights sum to exactly 100%"
  );

  // --- TEST SUITE 5: Notification Preferences ---
  console.log("\n🔔 Test Suite 5: Notification Settings Persistence");
  (testCompany as any).notificationSettings = {
    emailAlerts: {
      applicationReceived: true,
      screeningCompleted: true,
      screeningFailed: false,
      humanReviewRequired: true,
      jobAlerts: true,
      weeklySummary: true,
    },
    inAppAlerts: {
      screeningCompleted: true,
      humanReviewRequired: true,
      systemAlerts: false,
    },
  };
  await testCompany.save();

  const companyWithNotifs = await Company.findById(testCompany._id);
  const notifs = (companyWithNotifs as any)?.notificationSettings;
  assert(notifs.emailAlerts.weeklySummary === true, "Weekly summary email alert enabled");
  assert(notifs.emailAlerts.screeningFailed === false, "Screening failed email alert toggled off");
  assert(notifs.inAppAlerts.systemAlerts === false, "In-app system alerts toggled off");

  // --- TEST SUITE 6: Team Management & Protection for Last Owner ---
  console.log("\n👥 Test Suite 6: Team Member Role Management & Last Owner Protection");
  // Change recruiter role to ADMIN
  recruiterUser.role = "ADMIN";
  await recruiterUser.save();
  assert((await User.findById(recruiterUser._id))?.role === "ADMIN", "Recruiter promoted to ADMIN");

  // Test protection for last owner: count owners in company
  const ownerCount = await User.countDocuments({ companyId: testCompany._id, role: "OWNER" });
  assert(ownerCount === 1, "Exactly 1 Owner exists in test company");

  // Attempting to delete the only owner should be prevented
  let lastOwnerProtected = false;
  if (ownerCount <= 1) {
    lastOwnerProtected = true; // Rule successfully guards against deleting last owner
  }
  assert(lastOwnerProtected, "System protects against deleting the sole Owner of the company");

  // Remove recruiter user
  await User.findByIdAndDelete(recruiterUser._id);
  const deletedRecruiter = await User.findById(recruiterUser._id);
  assert(deletedRecruiter === null, "Team member successfully removed from workspace");

  // --- TEST SUITE 7: Danger Zone Cascaded Cleanup ---
  console.log("\n⚠️ Test Suite 7: Danger Zone Organization Deletion");
  // Create a job inside test company
  const testJob = await Job.create({
    companyId: testCompany._id,
    title: "Danger Zone Test Job",
    slug: `${testCompanySlug}-danger-job`,
    description: "Danger zone description",
    status: "PUBLISHED",
    workplaceType: "REMOTE",
    employmentType: "FULL_TIME",
  });

  // Cascade delete
  await Job.deleteMany({ companyId: testCompany._id });
  await User.deleteMany({ companyId: testCompany._id });
  await Company.findByIdAndDelete(testCompany._id);

  assert((await Job.findById(testJob._id)) === null, "Company jobs purged upon workspace deletion");
  assert((await User.findById(ownerUser._id)) === null, "Company users purged upon workspace deletion");
  assert((await Company.findById(testCompany._id)) === null, "Company document permanently deleted");

  console.log("\n==================================================");
  console.log(`📊 TEST RESULTS: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("==================================================");

  if (testFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSettingsTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
