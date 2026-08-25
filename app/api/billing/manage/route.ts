import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { downgradeCompanyPlan, getCompanyJobUsage } from "@/lib/billing/subscription";
import Company from "@/models/Company";
import connectToDatabase from "@/lib/db/mongodb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const body = await req.json().catch(() => ({}));
    const { action } = body; // "CANCEL" | "DOWNGRADE" | "RESUME"

    await connectToDatabase();
    const company = await Company.findById(tenant.companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    if (action === "DOWNGRADE") {
      const updatedUsage = await downgradeCompanyPlan(tenant.companyId);
      return NextResponse.json({
        success: true,
        message: "Your subscription has been switched to Free Plan.",
        data: updatedUsage,
      });
    }

    if (action === "CANCEL") {
      if (company.subscription) {
        company.subscription.cancelAtPeriodEnd = true;
        await company.save();
      }
      const updatedUsage = await getCompanyJobUsage(tenant.companyId);
      return NextResponse.json({
        success: true,
        message: "Your subscription will not renew at the end of the billing period.",
        data: updatedUsage,
      });
    }

    if (action === "RESUME") {
      if (company.subscription) {
        company.subscription.cancelAtPeriodEnd = false;
        await company.save();
      }
      const updatedUsage = await getCompanyJobUsage(tenant.companyId);
      return NextResponse.json({
        success: true,
        message: "Your subscription renewal has been resumed.",
        data: updatedUsage,
      });
    }

    const usage = await getCompanyJobUsage(tenant.companyId);
    return NextResponse.json({ success: true, data: usage });
  } catch (error: any) {
    console.error("Manage billing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update subscription." },
      { status: 500 }
    );
  }
}
