import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse, isOwnerOrAdmin, forbiddenResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import GoogleIntegration from "@/models/GoogleIntegration";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    if (!isOwnerOrAdmin(tenant.role)) {
      return forbiddenResponse("Only company Owners and Admins can disconnect integrations.");
    }

    await connectToDatabase();

    await GoogleIntegration.findOneAndDelete({ companyId: tenant.companyId });

    return NextResponse.json({
      success: true,
      message: "Google Sheets integration has been disconnected from your workspace.",
    });
  } catch (error: any) {
    console.error("Disconnect Google Sheets error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to disconnect Google Sheets." },
      { status: 500 }
    );
  }
}
