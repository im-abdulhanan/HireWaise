import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import GoogleIntegration from "@/models/GoogleIntegration";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/google-sheets/status
 * Returns connection and linked spreadsheet status for the authenticated company.
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) {
      return unauthorizedResponse("HireWise session expired or invalid. Please sign in to HireWise.");
    }

    await connectToDatabase();

    const integration = await GoogleIntegration.findOne({
      companyId: tenant.companyId,
    }).lean();

    if (!integration || !integration.encryptedAccessToken) {
      return NextResponse.json({
        success: true,
        data: {
          isConnected: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isConnected: true,
        connectedEmail: integration.connectedEmail,
        spreadsheetId: integration.connectedSpreadsheetId,
        spreadsheetTitle: integration.spreadsheetTitle,
        spreadsheetUrl: integration.spreadsheetUrl,
        autoSyncEnabled: integration.autoSyncEnabled,
        lastSyncedAt: integration.lastSyncedAt,
        syncStatus: integration.syncStatus,
        syncError: integration.syncError,
        scopes: integration.scopes || [],
      },
    });
  } catch (error: any) {
    console.error("Google Sheets status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve Google Sheets status.", success: false },
      { status: 500 }
    );
  }
}
