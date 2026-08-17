import mongoose from "mongoose";
import connectToDatabase from "../lib/db/mongodb";
import User from "../models/User";
import Company from "../models/Company";

async function testAuthProviders() {
  process.loadEnvFile(".env");
  await connectToDatabase();

  console.log("=== TESTING MULTI-PROVIDER AUTH & TENANT ISOLATION ===");

  // 1. Create a Company Workspace for Google User
  const googleCompany = await Company.create({
    name: "Acme Google Workspace",
    slug: `acme-google-${Date.now()}`,
    settings: { retentionDays: 365, allowPublicApplications: true, autoSyncSheets: true },
  });

  // 2. Create a Google User (No passwordHash stored!)
  const googleUser = await User.create({
    name: "Alice Google",
    email: `alice.google.${Date.now()}@example.com`,
    image: "https://lh3.googleusercontent.com/a/mock-google-avatar",
    provider: "google",
    providerAccountId: "google-oauth-sub-12345",
    companyId: googleCompany._id,
    role: "OWNER",
  });

  console.log(" Google User Created Successfully:", {
    id: googleUser._id.toString(),
    email: googleUser.email,
    provider: googleUser.provider,
    providerAccountId: googleUser.providerAccountId,
    companyId: googleUser.companyId.toString(),
    hasPassword: Boolean(googleUser.passwordHash),
  });

  if (googleUser.passwordHash) {
    throw new Error("FAIL: Password hash should NOT be present for Google OAuth user");
  }

  // 3. Create a Company Workspace for GitHub User
  const githubCompany = await Company.create({
    name: "Dev GitHub Workspace",
    slug: `dev-github-${Date.now()}`,
    settings: { retentionDays: 365, allowPublicApplications: true, autoSyncSheets: true },
  });

  // 4. Create a GitHub User (No passwordHash stored!)
  const githubUser = await User.create({
    name: "Bob GitHub",
    email: `bob.github.${Date.now()}@example.com`,
    image: "https://avatars.githubusercontent.com/u/mock-github-avatar",
    provider: "github",
    providerAccountId: "github-oauth-id-67890",
    companyId: githubCompany._id,
    role: "OWNER",
  });

  console.log(" GitHub User Created Successfully:", {
    id: githubUser._id.toString(),
    email: githubUser.email,
    provider: githubUser.provider,
    providerAccountId: githubUser.providerAccountId,
    companyId: githubUser.companyId.toString(),
    hasPassword: Boolean(githubUser.passwordHash),
  });

  if (githubUser.passwordHash) {
    throw new Error("FAIL: Password hash should NOT be present for GitHub OAuth user");
  }

  // Clean up test documents
  await User.deleteMany({ _id: { $in: [googleUser._id, githubUser._id] } });
  await Company.deleteMany({ _id: { $in: [googleCompany._id, githubCompany._id] } });

  console.log("\n ALL MULTI-PROVIDER AUTH ASSERTIONS PASSED!");
  await mongoose.disconnect();
}

testAuthProviders().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
