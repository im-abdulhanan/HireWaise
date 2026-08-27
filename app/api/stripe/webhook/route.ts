import { NextRequest, NextResponse } from "next/server";
import { getStripeServer, handleStripeWebhookEvent } from "@/lib/stripe/stripe";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhook
 * Receives and validates asynchronous Stripe webhook events.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripeServer();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }

    const result = await handleStripeWebhookEvent(event);

    return NextResponse.json({
      received: true,
      type: result.type,
    });
  } catch (error: any) {
    console.error("Stripe webhook verification error:", error?.message || error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed." },
      { status: 400 }
    );
  }
}
