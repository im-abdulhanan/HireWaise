import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { createStripeCheckoutSession } from "@/lib/stripe/stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/stripe/checkout
 * Generates a Stripe Checkout Session for upgrading to the Pro Plan.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const returnUrl = `${protocol}://${host}/dashboard/billing`;

    const { sessionId, url } = await createStripeCheckoutSession({
      companyId: tenant.companyId,
      companyName: tenant.name,
      userEmail: tenant.email,
      returnUrl,
    });

    if (!url) {
      return NextResponse.json(
        { error: "Failed to generate Stripe checkout URL.", success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      url,
    });
  } catch (error: any) {
    console.error("Stripe checkout error:", error?.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate Stripe checkout.", success: false },
      { status: 500 }
    );
  }
}
