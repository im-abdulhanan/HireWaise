import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { getGoogleAuthUrl } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/google-sheets/connect
 * Initiates the Google OAuth 2.0 flow for Google Sheets integration.
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) {
      return unauthorizedResponse("HireWise session expired or invalid. Please sign in to HireWise.");
    }

    const from = req.nextUrl.searchParams.get("from") || "integrations";
    const authUrl = getGoogleAuthUrl(tenant.companyId, tenant.userId, from);

    const acceptsJson =
      req.headers.get("accept")?.includes("application/json") ||
      req.nextUrl.searchParams.get("json") === "true";

    if (acceptsJson) {
      return NextResponse.json({ success: true, url: authUrl });
    }

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Google connect error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to initiate Google OAuth. Please check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
        success: false,
      },
      { status: 500 }
    );
  }
}
