import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { getGoogleAuthUrl } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const authUrl = getGoogleAuthUrl(tenant.companyId);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Google connect error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to initiate Google OAuth. Please check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
      },
      { status: 500 }
    );
  }
}
