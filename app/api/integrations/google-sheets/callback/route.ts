import { NextRequest, NextResponse } from "next/server";
import { handleGoogleOAuthCallback } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

/**
 * Google Sheets OAuth 2.0 Callback Route Handler
 * Endpoint: /api/integrations/google-sheets/callback
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // Contains companyId
    const error = searchParams.get("error");

    // Determine target redirect location (integrations page or settings integrations tab)
    const returnToSettings = searchParams.get("from") === "settings";
    const redirectBase = returnToSettings
      ? "/dashboard/settings?tab=integrations"
      : "/dashboard/integrations/google";

    // 1. Handle user cancellation or OAuth error from Google
    if (error) {
      const errorMessage =
        error === "access_denied"
          ? "Google Sheets authorization was canceled by the user."
          : `Google authorization failed: ${error}`;

      const redirectUrl = new URL(redirectBase, req.url);
      redirectUrl.searchParams.set("error", errorMessage);
      return NextResponse.redirect(redirectUrl);
    }

    // 2. Validate presence of code and state
    if (!code || !state) {
      const redirectUrl = new URL(redirectBase, req.url);
      redirectUrl.searchParams.set(
        "error",
        "Invalid authorization response: missing code or company state."
      );
      return NextResponse.redirect(redirectUrl);
    }

    // 3. Exchange code for encrypted tokens and save integration
    await handleGoogleOAuthCallback(code, state);

    // 4. Redirect with success status
    const redirectUrl = new URL(redirectBase, req.url);
    redirectUrl.searchParams.set("success", "connected");
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("Google Sheets OAuth callback error:", error);
    const redirectUrl = new URL("/dashboard/integrations/google", req.url);
    redirectUrl.searchParams.set(
      "error",
      error.message || "Failed to complete Google Sheets authorization."
    );
    return NextResponse.redirect(redirectUrl);
  }
}
