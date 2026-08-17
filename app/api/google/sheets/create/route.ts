import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { createScreeningSpreadsheet } from "@/lib/google/sheets";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const body = await req.json().catch(() => ({}));
    const title = body.title || `${tenant.name || "Company"} - Candidate Screening Pipeline`;

    const result = await createScreeningSpreadsheet(tenant.companyId, title);

    return NextResponse.json({
      success: true,
      message: "Screening spreadsheet created successfully.",
      data: result,
    });
  } catch (error: any) {
    console.error("Create spreadsheet error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Google Spreadsheet." },
      { status: 500 }
    );
  }
}
