import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { createScreeningSpreadsheet } from "@/lib/google/sheets";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/google-sheets/create
 * Creates a new 17-column candidate screening Google Spreadsheet
 * for the authenticated HireWise company workspace.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate HireWise session
    const tenant = await getTenantContext();
    if (!tenant) {
      return unauthorizedResponse("HireWise session expired or invalid. Please sign in to HireWise.");
    }

    const body = await req.json().catch(() => ({}));
    const customTitle = body.title?.trim();
    const title =
      customTitle ||
      `${tenant.name || "HireWise"} - Candidate Screening Pipeline (${new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })})`;

    // 2. Create spreadsheet using authenticated Google connection
    const result = await createScreeningSpreadsheet(tenant.companyId, title);

    return NextResponse.json({
      success: true,
      message: "17-column Google Spreadsheet created and linked successfully.",
      data: result,
    });
  } catch (error: any) {
    console.error("Create Google Sheet API error:", error?.message || error);

    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error: error.message || "Failed to create Google Spreadsheet.",
        success: false,
      },
      { status }
    );
  }
}
