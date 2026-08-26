import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { disconnectGoogleIntegration } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/google-sheets/disconnect
 * Disconnects and removes Google Sheets integration for the authenticated company.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) {
      return unauthorizedResponse("HireWise session expired or invalid. Please sign in to HireWise.");
    }

    await disconnectGoogleIntegration(tenant.companyId);

    return NextResponse.json({
      success: true,
      message: "Google Sheets integration disconnected successfully.",
    });
  } catch (error: any) {
    console.error("Google Sheets disconnect error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to disconnect Google Sheets integration.", success: false },
      { status: 500 }
    );
  }
}
