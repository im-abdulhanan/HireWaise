import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { syncCandidatesToGoogleSheet } from "@/lib/google/sheets";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/google-sheets/sync
 * Synchronizes verified candidate screening results to the linked Google Sheet.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) {
      return unauthorizedResponse("HireWise session expired or invalid. Please sign in to HireWise.");
    }

    const result = await syncCandidatesToGoogleSheet(tenant.companyId);

    return NextResponse.json({
      success: true,
      message: `Synchronized ${result.syncedCount} candidate screening records to Google Sheets.`,
      data: result,
    });
  } catch (error: any) {
    console.error("Google Sheets sync error:", error?.message || error);
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || "Failed to synchronize to Google Sheets.", success: false },
      { status }
    );
  }
}
