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
import User from "../models/User";
import GoogleIntegration from "../models/GoogleIntegration";
import {
  getGoogleOAuthClient,
  getGoogleAuthUrl,
  generateOAuthState,
  parseAndVerifyOAuthState,
  getAuthenticatedGoogleClient,
  disconnectGoogleIntegration,
  GOOGLE_SHEETS_SCOPES,
} from "../lib/google/oauth";
import {
  formatCandidateRowForSheet,
  SCREENING_SHEET_HEADERS,
} from "../lib/google/sheets";
import { encryptToken, decryptToken } from "../lib/security/encryption";
import { verifyCompanyAccess } from "../lib/security/tenant-guard";

async function runGoogleSheetsOAuthTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING END-TO-END GOOGLE SHEETS INTEGRATION TESTS");
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

  // --- TEST SUITE 1: Minimal OAuth Scopes & Redirect URI ---
  console.log("📋 Test Suite 1: Minimum Scopes & Redirect URI");
  assert(
    GOOGLE_SHEETS_SCOPES.length === 3,
    "Google OAuth restricted strictly to 3 minimal scopes"
  );
  assert(
    GOOGLE_SHEETS_SCOPES.includes("https://www.googleapis.com/auth/spreadsheets") &&
      GOOGLE_SHEETS_SCOPES.includes("https://www.googleapis.com/auth/drive.file") &&
      GOOGLE_SHEETS_SCOPES.includes("https://www.googleapis.com/auth/userinfo.email"),
    "Required scopes: spreadsheets, drive.file, userinfo.email"
  );

  const testCompanyId = new Types.ObjectId().toString();
  const testUserId = new Types.ObjectId().toString();
  const authUrl = getGoogleAuthUrl(testCompanyId, testUserId, "integrations");
  const parsedAuthUrl = new URL(authUrl);

  assert(
    decodeURIComponent(parsedAuthUrl.searchParams.get("redirect_uri") || "").includes(
      "/api/integrations/google-sheets/callback"
    ),
    "OAuth redirect_uri points to /api/integrations/google-sheets/callback"
  );
  assert(
    !parsedAuthUrl.searchParams.get("redirect_uri")?.includes("/api/auth/callback/google"),
    "Auth URL does NOT collide with Auth.js login callback"
  );

  // --- TEST SUITE 2: Secure State Generation & Verification (Anti-Tamper HMAC) ---
  console.log("\n🔒 Test Suite 2: Secure OAuth State HMAC Verification");
  const stateToken = generateOAuthState(testCompanyId, testUserId, "integrations");
  const verifiedState = parseAndVerifyOAuthState(stateToken);

  assert(
    verifiedState.valid === true &&
      verifiedState.companyId === testCompanyId &&
      verifiedState.userId === testUserId &&
      verifiedState.from === "integrations",
    "Valid signed state token decodes and verifies accurately"
  );

  const tamperedState = stateToken.substring(0, stateToken.length - 4) + "XXXX";
  const tamperedResult = parseAndVerifyOAuthState(tamperedState);
  assert(
    tamperedResult.valid === false,
    "Tampered state token signature is strictly rejected"
  );

  const invalidStateResult = parseAndVerifyOAuthState("completely_invalid_garbage_state");
  assert(
    invalidStateResult.valid === false,
    "Non-base64 malformed state string is rejected"
  );

  // --- TEST SUITE 3: Token Encryption / Decryption System ---
  console.log("\n🔐 Test Suite 3: Token Encryption with GOOGLE_TOKEN_ENCRYPTION_KEY");
  const rawSampleAccessToken = "ya29.sample_google_access_token_super_secret_12345";
  const rawSampleRefreshToken = "1//04_sample_google_refresh_token_super_secret_67890";

  const encryptedAccess = encryptToken(rawSampleAccessToken);
  const encryptedRefresh = encryptToken(rawSampleRefreshToken);

  assert(
    encryptedAccess !== rawSampleAccessToken && !encryptedAccess.includes("ya29"),
    "Access token is encrypted using AES-256-GCM"
  );
  assert(
    encryptedRefresh !== rawSampleRefreshToken && !encryptedRefresh.includes("1//04"),
    "Refresh token is encrypted using AES-256-GCM"
  );
  assert(
    decryptToken(encryptedAccess) === rawSampleAccessToken,
    "Decrypted access token matches original token verbatim"
  );
  assert(
    decryptToken(encryptedRefresh) === rawSampleRefreshToken,
    "Decrypted refresh token matches original token verbatim"
  );

  // --- TEST SUITE 4: Multi-Tenant Isolation (Company A vs Company B) ---
  console.log("\n🏢 Test Suite 4: Strict Multi-Tenant Isolation");
  const companyAId = new Types.ObjectId().toString();
  const companyBId = new Types.ObjectId().toString();

  assert(
    verifyCompanyAccess(companyAId, companyAId) === true,
    "verifyCompanyAccess allows Company A to access Company A resources"
  );
  assert(
    verifyCompanyAccess(companyAId, companyBId) === false,
    "verifyCompanyAccess strictly blocks Company A from accessing Company B resources (Tenant Isolation)"
  );

  // --- TEST SUITE 5: Integration Lifecycle & Database Operations ---
  console.log("\n💾 Test Suite 5: GoogleIntegration Record Operations");
  const testCompany = await Company.create({
    name: "Sheets Lifecycle Corp",
    slug: `sheets-test-${Date.now()}`,
    settings: { retentionDays: 365, allowPublicApplications: true, autoSyncSheets: true },
  });

  // Check lookup when not connected
  let notConnectedThrown = false;
  try {
    await getAuthenticatedGoogleClient(testCompany._id.toString());
  } catch (err: any) {
    notConnectedThrown = true;
    assert(
      err.statusCode === 404 && err.message.includes("Google Workspace is not connected"),
      "getAuthenticatedGoogleClient returns 404 when company has no Google connection"
    );
  }
  assert(notConnectedThrown, "Lookup threw expected 404 when not connected");

  // Create Google integration record
  const integration = await GoogleIntegration.create({
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
    integration.connectedEmail === "recruiter@example.com",
    "Connected Google account email saved"
  );

  // Retrieve authenticated client
  const clientResult = await getAuthenticatedGoogleClient(testCompany._id.toString());
  assert(
    clientResult.oauth2Client !== null && Boolean(clientResult.integration),
    "getAuthenticatedGoogleClient returns valid oauth2Client and integration document"
  );

  // Test Disconnection
  await disconnectGoogleIntegration(testCompany._id.toString());
  const deletedDoc = await GoogleIntegration.findOne({ companyId: testCompany._id });
  assert(deletedDoc === null, "disconnectGoogleIntegration successfully deletes integration record from MongoDB");

  // --- TEST SUITE 6: Standardized 17-Column Schema Structure ---
  console.log("\n📊 Test Suite 6: Standardized 17-Column Data Schema Validation");
  assert(
    SCREENING_SHEET_HEADERS.length === 17,
    "SCREENING_SHEET_HEADERS contains exactly 17 columns"
  );

  const sampleRow = formatCandidateRowForSheet({
    applicationId: "APP-001",
    candidateName: "Jane Doe",
    email: "jane@example.com",
    jobTitle: "Senior Frontend Engineer",
    matchScore: 92,
    aiCategory: "STRONGLY_MATCHED",
    requiredSkillsMatched: "React, TypeScript, Next.js",
    requiredSkillsMissing: "None",
    preferredSkillsMatched: "GraphQL, Tailwind",
    experienceYears: "5.5 years",
    education: "B.S. Computer Science",
    evidenceSummary: "5+ years building production React & Next.js applications.",
    confidence: "95%",
    recruiterStatus: "ACCEPTED",
    submittedAt: "2026-08-26 10:00 AM",
    lastScreenedAt: "2026-08-26 10:05 AM",
    screeningVersion: "v1",
  });

  assert(
    sampleRow.length === 17,
    "formatCandidateRowForSheet outputs exactly 17 formatted cells"
  );
  assert(
    sampleRow[0] === "APP-001" && sampleRow[1] === "Jane Doe" && sampleRow[4] === "92/100",
    "Formatted cells correctly map Candidate ID, Name, and Match Score"
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
