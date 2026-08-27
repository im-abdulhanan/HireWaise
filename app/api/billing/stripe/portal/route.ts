import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { createStripePortalSession } from "@/lib/stripe/stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/stripe/portal
 * Generates a Stripe Customer Portal Session for managing cards and invoices.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const returnUrl = `${protocol}://${host}/dashboard/billing`;

    const { url } = await createStripePortalSession({
      companyId: tenant.companyId,
      userEmail: tenant.email,
      returnUrl,
    });

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error: any) {
    console.error("Stripe customer portal error:", error?.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to open Stripe billing portal.", success: false },
      { status: 500 }
    );
  }
}
