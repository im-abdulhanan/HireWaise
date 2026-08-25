import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { upgradeCompanyPlan } from "@/lib/billing/subscription";
import { PlanTier } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    let targetPlan: PlanTier = "PRO";
    try {
      const body = await req.json();
      if (body.plan === "PRO" || body.plan === "FREE") {
        targetPlan = body.plan;
      }
    } catch {
      // Default to PRO if no body passed
    }

    const updatedUsage = await upgradeCompanyPlan(tenant.companyId, targetPlan);

    return NextResponse.json({
      success: true,
      message: `Successfully activated ${updatedUsage.planConfig.name}. You can now create up to ${updatedUsage.jobsLimit} jobs per month.`,
      data: updatedUsage,
    });
  } catch (error: any) {
    console.error("Upgrade plan error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process plan upgrade." },
      { status: 500 }
    );
  }
}
