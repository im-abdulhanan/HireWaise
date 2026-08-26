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
import GoogleIntegration from "../models/GoogleIntegration";
import {
  getGoogleOAuthClient,
  getGoogleAuthUrl,
  GOOGLE_SHEETS_SCOPES,
} from "../lib/google/oauth";
import { encryptToken, decryptToken } from "../lib/security/encryption";

async function runGoogleSheetsOAuthTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING GOOGLE SHEETS OAUTH & CALLBACK TESTS");
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

  // --- TEST SUITE 1: OAuth Configuration & Redirect URI ---
  console.log("📋 Test Suite 1: Google OAuth Client & Redirect URI Validation");
  const oauthClient = getGoogleOAuthClient();
  assert(
    oauthClient !== null && oauthClient !== undefined,
    "OAuth2 client initializes successfully from environment"
  );

  const testCompanyId = new Types.ObjectId().toString();
  const authUrl = getGoogleAuthUrl(testCompanyId);
  const parsedAuthUrl = new URL(authUrl);

  assert(
    parsedAuthUrl.origin === "https://accounts.google.com",
    "Auth URL points to accounts.google.com"
  );
  assert(
    parsedAuthUrl.searchParams.get("state") === testCompanyId,
    "Auth URL state parameter contains the company ID"
  );
  assert(
    parsedAuthUrl.searchParams.get("access_type") === "offline",
    "Auth URL requests offline access for refresh tokens"
  );
  assert(
    parsedAuthUrl.searchParams.get("prompt") === "consent",
    "Auth URL forces consent prompt to obtain refresh token"
  );
  assert(
    decodeURIComponent(parsedAuthUrl.searchParams.get("redirect_uri") || "").includes(
      "/api/integrations/google-sheets/callback"
    ),
    "Auth URL redirect_uri points to /api/integrations/google-sheets/callback"
  );
  assert(
    !parsedAuthUrl.searchParams.get("redirect_uri")?.includes("/api/auth/callback/google"),
    "Auth URL does NOT collide with Auth.js login callback"
  );

  // --- TEST SUITE 2: Token Encryption System ---
  console.log("\n🔒 Test Suite 2: Token Encryption / Decryption System");
  const rawSampleAccessToken = "ya29.sample_google_access_token_super_secret_12345";
  const rawSampleRefreshToken = "1//04_sample_google_refresh_token_super_secret_67890";

  const encryptedAccess = encryptToken(rawSampleAccessToken);
  const encryptedRefresh = encryptToken(rawSampleRefreshToken);

  assert(
    encryptedAccess !== rawSampleAccessToken && !encryptedAccess.includes(rawSampleAccessToken),
    "Access token is properly encrypted and not stored as plaintext"
  );
  assert(
    encryptedRefresh !== rawSampleRefreshToken && !encryptedRefresh.includes(rawSampleRefreshToken),
    "Refresh token is properly encrypted and not stored as plaintext"
  );

  const decryptedAccess = decryptToken(encryptedAccess);
  const decryptedRefresh = decryptToken(encryptedRefresh);

  assert(
    decryptedAccess === rawSampleAccessToken,
    "Encrypted access token decrypts to exact original token"
  );
  assert(
    decryptedRefresh === rawSampleRefreshToken,
    "Encrypted refresh token decrypts to exact original token"
  );

  // --- TEST SUITE 3: MongoDB Integration Record Lifecycle ---
  console.log("\n🏢 Test Suite 3: MongoDB GoogleIntegration Record Lifecycle");
  const testCompanySlug = `google-test-${Date.now()}`;
  const testCompany = await Company.create({
    name: "Google Integration Test Corp",
    slug: testCompanySlug,
    settings: {
      retentionDays: 365,
      allowPublicApplications: true,
      autoSyncSheets: false,
    },
  });

  // Create mock integration record
  const mockIntegration = await GoogleIntegration.create({
    companyId: testCompany._id,
    encryptedAccessToken: encryptedAccess,
    encryptedRefreshToken: encryptedRefresh,
    tokenExpiry: new Date(Date.now() + 3600 * 1000),
    connectedEmail: "recruiter@example.com",
    scopes: GOOGLE_SHEETS_SCOPES,
    autoSyncEnabled: true,
    syncStatus: "IDLE",
  });

  assert(
    mockIntegration !== null && Boolean(mockIntegration._id),
    "GoogleIntegration document created in MongoDB"
  );
  assert(
    mockIntegration.connectedEmail === "recruiter@example.com",
    "Connected email stored properly on integration record"
  );
  assert(
    Array.isArray(mockIntegration.scopes) && mockIntegration.scopes.length === 3,
    "Granted scopes stored properly on integration record"
  );
  assert(
    mockIntegration.companyId.toString() === testCompany._id.toString(),
    "Integration record associated with correct companyId"
  );

  // Cleanup test resources
  console.log("\n🧹 Cleaning up test database fixtures...");
  await GoogleIntegration.deleteMany({ companyId: testCompany._id });
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

runGoogleSheetsOAuthTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
