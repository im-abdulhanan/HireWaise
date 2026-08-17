import { google } from "googleapis";
import { encryptToken, decryptToken } from "@/lib/security/encryption";
import connectToDatabase from "@/lib/db/mongodb";
import GoogleIntegration from "@/models/GoogleIntegration";
import { Types } from "mongoose";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured in environment variables."
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates the Google OAuth consent URL.
 */
export function getGoogleAuthUrl(companyId: string): string {
  const oauth2Client = getGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: companyId,
  });
}

/**
 * Exchanges authorization code for tokens and saves them encrypted in the database.
 */
export async function handleGoogleOAuthCallback(
  code: string,
  companyId: string
): Promise<{ success: boolean; email?: string }> {
  const oauth2Client = getGoogleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  // Fetch connected user email
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const connectedEmail = userInfo.data.email || undefined;

  const accessToken = tokens.access_token || "";
  const refreshToken = tokens.refresh_token || "";

  if (!accessToken) {
    throw new Error("Failed to obtain Google access token.");
  }

  const encryptedAccessToken = encryptToken(accessToken);
  const encryptedRefreshToken = refreshToken ? encryptToken(refreshToken) : "";

  const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;

  await connectToDatabase();

  let integration = await GoogleIntegration.findOne({ companyId });
  if (!integration) {
    integration = new GoogleIntegration({
      companyId: new Types.ObjectId(companyId),
    });
  }

  integration.encryptedAccessToken = encryptedAccessToken;
  if (encryptedRefreshToken) {
    integration.encryptedRefreshToken = encryptedRefreshToken;
  }
  integration.tokenExpiry = tokenExpiry;
  integration.connectedEmail = connectedEmail;
  integration.syncStatus = "IDLE";
  integration.syncError = undefined;
  await integration.save();

  return { success: true, email: connectedEmail };
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
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);

        if (credentials.access_token) {
          integration.encryptedAccessToken = encryptToken(credentials.access_token);
        }
        if (credentials.expiry_date) {
          integration.tokenExpiry = new Date(credentials.expiry_date);
        }
        await integration.save();
      } catch (refreshErr) {
        console.error("Token refresh failed:", refreshErr);
        integration.syncStatus = "ERROR";
        integration.syncError = "Google authorization expired. Please reconnect.";
        await integration.save();
        throw new Error("Google authorization expired. Please reconnect your account.");
      }
    }
  }

  return { oauth2Client, integration };
}
