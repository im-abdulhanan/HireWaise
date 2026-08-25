import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { getCompanyJobUsage } from "@/lib/billing/subscription";
import { getAllPlans } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const usage = await getCompanyJobUsage(tenant.companyId);
    const plans = getAllPlans();

    return NextResponse.json({
      success: true,
      data: {
        usage,
        plans,
        companyName: tenant.name,
      },
    });
  } catch (error: any) {
    console.error("Billing fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch billing information." },
      { status: 500 }
    );
  }
}
