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
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // 1. Handle user cancellation or OAuth error from Google
    if (error) {
      const errorMessage =
        error === "access_denied"
          ? "Google Sheets authorization was canceled by the user."
          : `Google authorization failed: ${error}`;

      const redirectUrl = new URL("/dashboard/integrations/google", req.url);
      redirectUrl.searchParams.set("error", errorMessage);
      return NextResponse.redirect(redirectUrl);
    }

    // 2. Validate presence of code and state
    if (!code || !state) {
      const redirectUrl = new URL("/dashboard/integrations/google", req.url);
      redirectUrl.searchParams.set(
        "error",
        "Invalid authorization response: missing authorization code or state token."
      );
      return NextResponse.redirect(redirectUrl);
    }

    // 3. Exchange code for encrypted tokens and save integration
    const result = await handleGoogleOAuthCallback(code, state);

    // 4. Redirect based on originating page (settings vs integrations)
    const targetPath =
      result.from === "settings"
        ? "/dashboard/settings?tab=integrations&success=google_connected"
        : "/dashboard/integrations/google?success=connected";

    return NextResponse.redirect(new URL(targetPath, req.url));
  } catch (error: any) {
    console.error("Google Sheets OAuth callback error:", error?.message || error);
    const redirectUrl = new URL("/dashboard/integrations/google", req.url);
    redirectUrl.searchParams.set(
      "error",
      error.message || "Failed to complete Google Sheets authorization."
    );
    return NextResponse.redirect(redirectUrl);
  }
}
