import { google } from "googleapis";
import { encryptToken, decryptToken } from "@/lib/security/encryption";
import connectToDatabase from "@/lib/db/mongodb";
import GoogleIntegration from "@/models/GoogleIntegration";
import Company from "@/models/Company";
import { Types } from "mongoose";

export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getGoogleOAuthClient(customRedirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  let redirectUri =
    customRedirectUri ||
    process.env.GOOGLE_SHEETS_REDIRECT_URI ||
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/api/integrations/google-sheets/callback";

  // Prevent collision with Auth.js login callback
  if (!redirectUri || redirectUri.includes("/api/auth/callback/google")) {
    redirectUri = "http://localhost:3000/api/integrations/google-sheets/callback";
  }

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured in environment variables."
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates the Google OAuth consent URL for Google Sheets integration.
 */
export function getGoogleAuthUrl(companyId: string, customRedirectUri?: string): string {
  const oauth2Client = getGoogleOAuthClient(customRedirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_SHEETS_SCOPES,
    prompt: "consent",
    state: companyId,
  });
}

/**
 * Exchanges authorization code for tokens and saves them encrypted in MongoDB.
 * Never exposes plaintext tokens to the browser.
 */
export async function handleGoogleOAuthCallback(
  code: string,
  companyId: string,
  customRedirectUri?: string
): Promise<{ success: boolean; email?: string; scopes?: string[] }> {
  if (!companyId || !Types.ObjectId.isValid(companyId)) {
    throw new Error("Invalid OAuth state: company ID is missing or malformed.");
  }

  await connectToDatabase();

  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error(`Invalid OAuth state: company with ID "${companyId}" does not exist.`);
  }

  const oauth2Client = getGoogleOAuthClient(customRedirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens || !tokens.access_token) {
    throw new Error("Failed to exchange code for Google access token.");
  }

  oauth2Client.setCredentials(tokens);

  // Fetch connected user email
  let connectedEmail: string | undefined;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    connectedEmail = userInfo.data.email || undefined;
  } catch (err) {
    console.warn("Could not fetch userinfo from Google:", err);
  }

  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token || "";

  const encryptedAccessToken = encryptToken(accessToken);
  const encryptedRefreshToken = refreshToken ? encryptToken(refreshToken) : "";

  const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
  const grantedScopes = tokens.scope ? tokens.scope.split(" ") : GOOGLE_SHEETS_SCOPES;

  let integration = await GoogleIntegration.findOne({ companyId: new Types.ObjectId(companyId) });
  if (!integration) {
    integration = new GoogleIntegration({
      companyId: new Types.ObjectId(companyId),
      encryptedAccessToken,
      encryptedRefreshToken: encryptedRefreshToken || "PENDING",
      autoSyncEnabled: true,
      syncStatus: "IDLE",
    });
  }

  integration.encryptedAccessToken = encryptedAccessToken;
  if (encryptedRefreshToken) {
    integration.encryptedRefreshToken = encryptedRefreshToken;
  }
  integration.tokenExpiry = tokenExpiry;
  integration.connectedEmail = connectedEmail;
  integration.scopes = grantedScopes;
  integration.syncStatus = "IDLE";
  integration.syncError = undefined;
  await integration.save();

  // Enable autoSyncSheets on company settings
  if (!company.settings.autoSyncSheets) {
    company.settings.autoSyncSheets = true;
    await company.save();
  }

  return { success: true, email: connectedEmail, scopes: grantedScopes };
}

/**
 * Retrieves an authenticated Google OAuth2 client with automatically refreshed credentials.
 */
export async function getAuthenticatedGoogleClient(companyId: string) {
  await connectToDatabase();

  const integration = await GoogleIntegration.findOne({ companyId });
  if (!integration || !integration.encryptedAccessToken) {
    throw new Error("Google integration is not connected for this company.");
  }

  const oauth2Client = getGoogleOAuthClient();

  const decryptedAccessToken = decryptToken(integration.encryptedAccessToken);
  const decryptedRefreshToken = integration.encryptedRefreshToken
    ? decryptToken(integration.encryptedRefreshToken)
    : undefined;

  oauth2Client.setCredentials({
    access_token: decryptedAccessToken,
    refresh_token: decryptedRefreshToken,
    expiry_date: integration.tokenExpiry ? integration.tokenExpiry.getTime() : undefined,
  });

  // Check if token is expired and refresh if necessary
  if (integration.tokenExpiry && integration.tokenExpiry.getTime() < Date.now() + 60000) {
    if (decryptedRefreshToken) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (credentials.access_token) {
        integration.encryptedAccessToken = encryptToken(credentials.access_token);
        if (credentials.refresh_token) {
          integration.encryptedRefreshToken = encryptToken(credentials.refresh_token);
        }
        if (credentials.expiry_date) {
          integration.tokenExpiry = new Date(credentials.expiry_date);
        }
        await integration.save();
      }
    }
  }

  return oauth2Client;
}
