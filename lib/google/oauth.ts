import { google } from "googleapis";
import crypto from "crypto";
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

const STATE_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ||
  "hirewise-google-oauth-state-secret-production";

/**
 * Generates a signed, tamper-proof state token for OAuth consent.
 */
export function generateOAuthState(
  companyId: string,
  userId = "",
  from = "integrations"
): string {
  const timestamp = Date.now();
  const payload = `${companyId}:${userId}:${from}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", STATE_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

/**
 * Validates and decodes the OAuth state parameter.
 */
export function parseAndVerifyOAuthState(state: string): {
  valid: boolean;
  companyId?: string;
  userId?: string;
  from?: string;
  expired?: boolean;
} {
  if (!state) return { valid: false };

  try {
    const raw = Buffer.from(state, "base64url").toString("utf-8");
    const parts = raw.split(":");
    if (parts.length >= 5) {
      const [companyId, userId, from, timestampStr, hmac] = parts;
      const payload = `${companyId}:${userId}:${from}:${timestampStr}`;
      const expectedHmac = crypto.createHmac("sha256", STATE_SECRET).update(payload).digest("hex");

      if (hmac !== expectedHmac) {
        return { valid: false };
      }

      const timestamp = parseInt(timestampStr, 10);
      // Valid for 60 minutes
      if (Date.now() - timestamp > 60 * 60 * 1000) {
        return { valid: false, expired: true };
      }

      return { valid: true, companyId, userId, from };
    }
  } catch {
    // Fall through to plain ObjectId check
  }

  // Fallback support for plain companyId strings
  if (Types.ObjectId.isValid(state)) {
    return { valid: true, companyId: state, from: "integrations" };
  }

  return { valid: false };
}

/**
 * Creates the Google OAuth2 client with appropriate redirect URI.
 */
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
 * Generates the Google OAuth consent URL with minimum required scopes.
 */
export function getGoogleAuthUrl(
  companyId: string,
  userId = "",
  from = "integrations",
  customRedirectUri?: string
): string {
  const oauth2Client = getGoogleOAuthClient(customRedirectUri);
  const stateToken = generateOAuthState(companyId, userId, from);

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_SHEETS_SCOPES,
    prompt: "consent",
    state: stateToken,
  });
}

/**
 * Exchanges authorization code for tokens and saves them encrypted in MongoDB.
 * Never exposes plaintext tokens to the browser.
 */
export async function handleGoogleOAuthCallback(
  code: string,
  state: string,
  customRedirectUri?: string
): Promise<{ success: boolean; email?: string; scopes?: string[]; companyId: string; from: string }> {
  const verifiedState = parseAndVerifyOAuthState(state);
  if (!verifiedState.valid || !verifiedState.companyId) {
    const err: any = new Error(
      verifiedState.expired
        ? "Google authorization state expired. Please try connecting again."
        : "Invalid Google authorization state. Security verification failed."
    );
    err.statusCode = 400;
    throw err;
  }

  const companyId = verifiedState.companyId;
  const from = verifiedState.from || "integrations";

  await connectToDatabase();

  const company = await Company.findById(companyId);
  if (!company) {
    const err: any = new Error(`Company with ID "${companyId}" was not found.`);
    err.statusCode = 404;
    throw err;
  }

  const oauth2Client = getGoogleOAuthClient(customRedirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens || !tokens.access_token) {
    const err: any = new Error("Failed to exchange code for Google access token.");
    err.statusCode = 403;
    throw err;
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

  return {
    success: true,
    email: connectedEmail,
    scopes: grantedScopes,
    companyId,
    from,
  };
}

/**
 * Retrieves an authenticated Google OAuth2 client with automatically refreshed credentials.
 * Returns both oauth2Client and the Mongoose integration document.
 */
export async function getAuthenticatedGoogleClient(companyId: string) {
  if (!companyId || !Types.ObjectId.isValid(companyId)) {
    const err: any = new Error("Invalid company ID provided.");
    err.statusCode = 400;
    throw err;
  }

  await connectToDatabase();

  const integration = await GoogleIntegration.findOne({
    companyId: new Types.ObjectId(companyId),
  });

  if (!integration || !integration.encryptedAccessToken) {
    const err: any = new Error(
      "Google Workspace is not connected. Please connect your Google account first."
    );
    err.statusCode = 404;
    throw err;
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

  // Check if token is expired or within 60 seconds of expiry and refresh
  const isExpiringSoon =
    !integration.tokenExpiry ||
    integration.tokenExpiry.getTime() < Date.now() + 60000 ||
    !decryptedAccessToken;

  if (isExpiringSoon && decryptedRefreshToken && decryptedRefreshToken !== "PENDING") {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (credentials.access_token) {
        integration.encryptedAccessToken = encryptToken(credentials.access_token);
        if (credentials.refresh_token) {
          integration.encryptedRefreshToken = encryptToken(credentials.refresh_token);
        }
        if (credentials.expiry_date) {
          integration.tokenExpiry = new Date(credentials.expiry_date);
        }
        integration.syncStatus = "IDLE";
        integration.syncError = undefined;
        await integration.save();
        oauth2Client.setCredentials(credentials);
      }
    } catch (err: any) {
      console.error("Google OAuth token refresh error:", err?.message || err);
      const isRevoked =
        err?.message?.includes("invalid_grant") ||
        err?.message?.includes("token_revoked") ||
        err?.code === 400 ||
        err?.response?.data?.error === "invalid_grant";

      if (isRevoked) {
        integration.syncStatus = "ERROR";
        integration.syncError =
          "Your Google account connection has expired or was revoked. Please reconnect Google Sheets.";
        await integration.save();

        const authErr: any = new Error(
          "Your Google account connection has expired. Please reconnect Google Sheets."
        );
        authErr.statusCode = 403;
        throw authErr;
      }

      throw err;
    }
  }

  return { oauth2Client, integration };
}

/**
 * Disconnects the Google Sheets integration for a company.
 */
export async function disconnectGoogleIntegration(companyId: string): Promise<boolean> {
  await connectToDatabase();

  const integration = await GoogleIntegration.findOne({
    companyId: new Types.ObjectId(companyId),
  });

  if (integration) {
    // Attempt to revoke token with Google if refresh token exists
    try {
      if (integration.encryptedRefreshToken) {
        const decryptedRefreshToken = decryptToken(integration.encryptedRefreshToken);
        if (decryptedRefreshToken && decryptedRefreshToken !== "PENDING") {
          const client = getGoogleOAuthClient();
          await client.revokeToken(decryptedRefreshToken);
        }
      }
    } catch {
      // Non-fatal if revoke fails remotely
    }

    await GoogleIntegration.deleteOne({ _id: integration._id });
  }

  return true;
}
