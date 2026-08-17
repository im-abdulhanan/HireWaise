import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import GoogleIntegration from "@/models/GoogleIntegration";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

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
      },
    });
  } catch (error: any) {
    console.error("Google status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
