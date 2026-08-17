import { NextRequest, NextResponse } from "next/server";
import { handleGoogleOAuthCallback } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const companyId = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/integrations/google?error=${encodeURIComponent(error)}`,
          req.url
        )
      );
    }

    if (!code || !companyId) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/integrations/google?error=Missing+authorization+code+or+state",
          req.url
        )
      );
    }

    await handleGoogleOAuthCallback(code, companyId);

    return NextResponse.redirect(
      new URL("/dashboard/integrations/google?success=connected", req.url)
    );
  } catch (error: any) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations/google?error=${encodeURIComponent(
          error.message || "Failed to complete Google authorization."
        )}`,
        req.url
      )
    );
  }
}
