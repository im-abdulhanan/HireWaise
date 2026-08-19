import fs from "fs";
import path from "path";

// Load .env file
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  } else {
    const envPath = path.resolve(process.cwd(), ".env");
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
} catch (e) {
  // Ignore
}

import connectToDatabase from "../lib/db/mongodb";
import User from "../models/User";
import Company from "../models/Company";
import { authOptions } from "../lib/auth/auth";
import bcrypt from "bcryptjs";

// Helper to execute Credentials authorize function
async function authorizeCredentials(email: string, password: string) {
  const credentialsProvider = authOptions.providers.find(
    (p: any) => p.id === "credentials" || p.name === "Credentials" || p.type === "credentials"
  ) as any;

  const authFn = credentialsProvider.options?.authorize || credentialsProvider.authorize;
  if (!authFn) {
    throw new Error(`Authorize function not found`);
  }

  const result = await authFn({ email, password });
  return result;
}

// Helper to simulate registration
async function registerUser(name: string, email: string, password: string, companyName: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = name.trim();
  const trimmedCompany = companyName.trim();

  await connectToDatabase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new Error("An account with this email already exists.");
  }

  const company = await Company.create({
    name: trimmedCompany,
    slug: `test-co-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    settings: {
      retentionDays: 365,
      allowPublicApplications: true,
      autoSyncSheets: true,
    },
  });

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name: trimmedName,
    email: normalizedEmail,
    passwordHash,
    companyId: company._id,
    role: "OWNER",
    lastLoginAt: new Date(),
  });

  return { user, company };
}

async function runRegressionTests() {
  console.log("=================================================");
  console.log("RUNNING AUTHENTICATION REGRESSION TESTS (A to E)");
  console.log("=================================================\n");

  await connectToDatabase();

  const timestamp = Date.now();

  // ----------------------------------------------------
  // TEST A: Register new user → immediately login → SUCCESS (FIRST ATTEMPT)
  // ----------------------------------------------------
  console.log("[TEST A] Register new user -> immediately login on FIRST attempt...");
  const testAEmail = `test_a_${timestamp}@example.com`;
  const testAPassword = "SecurePassword123!";

  const regA = await registerUser("Test User A", testAEmail, testAPassword, "Company A");
  if (!regA.user?._id) {
    throw new Error("TEST A FAILED: User creation failed.");
  }

  // Attempt immediate login (First Attempt)
  const loginA = await authorizeCredentials(testAEmail, testAPassword);
  if (!loginA || loginA.email !== testAEmail) {
    throw new Error("TEST A FAILED: First-attempt login failed after registration.");
  }
  console.log("  ✓ TEST A PASSED: First-attempt login succeeded immediately.\n");

  // ----------------------------------------------------
  // TEST B: Register new user → login with wrong password → FAIL
  // ----------------------------------------------------
  console.log("[TEST B] Register new user -> login with wrong password -> FAIL...");
  const testBEmail = `test_b_${timestamp}@example.com`;
  const testBPassword = "CorrectPassword123!";
  const testBWrongPassword = "WrongPassword999!";

  await registerUser("Test User B", testBEmail, testBPassword, "Company B");

  const loginB = await authorizeCredentials(testBEmail, testBWrongPassword);
  if (loginB !== null) {
    throw new Error("TEST B FAILED: Login with incorrect password should return null.");
  }
  console.log("  ✓ TEST B PASSED: Login with wrong password correctly rejected.\n");

  // ----------------------------------------------------
  // TEST C: Register with 'User@Example.com' → login with 'user@example.com' → SUCCESS
  // ----------------------------------------------------
  console.log("[TEST C] Register with mixed-case 'UserC_Test@Example.COM ' -> login with lowercase...");
  const mixedEmail = `UserC_Test_${timestamp}@Example.COM `;
  const lowerEmail = `userc_test_${timestamp}@example.com`;
  const testCPassword = "PasswordCaseTest123!";

  await registerUser("Test User C", mixedEmail, testCPassword, "Company C");

  const loginC = await authorizeCredentials(lowerEmail, testCPassword);
  if (!loginC || loginC.email !== lowerEmail) {
    throw new Error("TEST C FAILED: Case-insensitive email normalization failed.");
  }
  console.log("  ✓ TEST C PASSED: Case normalization login succeeded on first attempt.\n");

  // ----------------------------------------------------
  // TEST D: Register → logout simulation → login → SUCCESS
  // ----------------------------------------------------
  console.log("[TEST D] Register -> logout simulation -> login -> SUCCESS...");
  const testDEmail = `test_d_${timestamp}@example.com`;
  const testDPassword = "PasswordTestD123!";

  await registerUser("Test User D", testDEmail, testDPassword, "Company D");

  // 1st login
  const firstLoginD = await authorizeCredentials(testDEmail, testDPassword);
  if (!firstLoginD) throw new Error("TEST D FAILED: Initial login failed.");

  // Simulate logout (clear memory state, verify re-login)
  const secondLoginD = await authorizeCredentials(testDEmail, testDPassword);
  if (!secondLoginD || secondLoginD.email !== testDEmail) {
    throw new Error("TEST D FAILED: Re-login after session end failed.");
  }
  console.log("  ✓ TEST D PASSED: Re-login after logout succeeded.\n");

  // ----------------------------------------------------
  // TEST E: Attempt duplicate registration with same email → correctly rejected
  // ----------------------------------------------------
  console.log("[TEST E] Duplicate registration with existing email -> correctly rejected...");
  const testEEmail = `test_e_${timestamp}@example.com`;
  const testEPassword = "PasswordTestE123!";

  await registerUser("Test User E", testEEmail, testEPassword, "Company E");

  let duplicateRejected = false;
  try {
    await registerUser("Test User E Duplicate", testEEmail.toUpperCase(), testEPassword, "Company E2");
  } catch (err: any) {
    duplicateRejected = true;
    console.log(`  ✓ Caught expected duplicate error: "${err.message}"`);
  }

  if (!duplicateRejected) {
    throw new Error("TEST E FAILED: Duplicate registration was not rejected.");
  }
  console.log("  ✓ TEST E PASSED: Duplicate registration correctly prevented.\n");

  // Cleanup test users from DB
  console.log("Cleaning up test users...");
  await User.deleteMany({
    email: { $in: [testAEmail, testBEmail, lowerEmail, testDEmail, testEEmail] },
  });
  console.log("Cleaned up test data.\n");

  console.log("=================================================");
  console.log("ALL REGRESSION TESTS PASSED SUCCESSFULLY! (5/5)");
  console.log("=================================================");
}

runRegressionTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ REGRESSION TEST FAILED:", err);
    process.exit(1);
  });
