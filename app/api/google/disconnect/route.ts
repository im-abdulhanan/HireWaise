import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import GoogleIntegration from "@/models/GoogleIntegration";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    await connectToDatabase();

    await GoogleIntegration.findOneAndDelete({ companyId: tenant.companyId });

    return NextResponse.json({
      success: true,
      message: "Google Sheets integration disconnected successfully.",
    });
  } catch (error: any) {
    console.error("Google disconnect error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to disconnect Google integration." },
      { status: 500 }
    );
  }
}
