import Stripe from "stripe";
import connectToDatabase from "@/lib/db/mongodb";
import Company from "@/models/Company";
import { upgradeCompanyPlan, downgradeCompanyPlan } from "@/lib/billing/subscription";

let stripeClient: Stripe | null = null;

/**
 * Singleton server-side Stripe SDK instance.
 */
export function getStripeServer(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured in environment variables. Please check .env configuration."
      );
    }
    stripeClient = new Stripe(secretKey, {
      typescript: true,
    });
  }
  return stripeClient;
}

/**
 * Creates or retrieves a Stripe Customer for a given company.
 */
export async function getOrCreateStripeCustomer(
  companyId: string,
  userEmail: string,
  companyName = "HireWise Customer"
): Promise<string> {
  const stripe = getStripeServer();
  await connectToDatabase();

  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error(`Company with ID ${companyId} not found.`);
  }

  // If already linked to Stripe customer
  if (company.subscription?.stripeCustomerId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(
        company.subscription.stripeCustomerId
      );
      if (!existingCustomer.deleted) {
        return existingCustomer.id;
      }
    } catch {
      // If customer not found in Stripe, recreate below
    }
  }

  // Create new customer in Stripe
  const customer = await stripe.customers.create({
    email: userEmail,
    name: company.name || companyName,
    metadata: {
      companyId: company._id.toString(),
      companySlug: company.slug,
    },
  });

  if (!company.subscription) {
    company.subscription = {
      plan: "FREE",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      jobsUsedThisPeriod: 0,
      cancelAtPeriodEnd: false,
    };
  }

  company.subscription.stripeCustomerId = customer.id;
  await company.save();

  return customer.id;
}

/**
 * Creates a Stripe Checkout Session for Pro Plan subscription ($10/mo, 50 jobs).
 */
export async function createStripeCheckoutSession({
  companyId,
  companyName,
  userEmail,
  returnUrl,
}: {
  companyId: string;
  companyName?: string;
  userEmail: string;
  returnUrl: string;
}): Promise<{ sessionId: string; url: string | null }> {
  const stripe = getStripeServer();
  const customerId = await getOrCreateStripeCustomer(companyId, userEmail, companyName);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "HireWise Pro Plan",
            description:
              "50 Job Postings per month, Priority AI Screening, Real-Time Google Sheets Sync, Unlimited Seats",
          },
          unit_amount: 1000, // $10.00 USD
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      companyId,
      plan: "PRO",
    },
    subscription_data: {
      metadata: {
        companyId,
        plan: "PRO",
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${returnUrl}?canceled=true`,
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Creates a Stripe Customer Billing Portal Session for managing payment methods, invoices, and cancellation.
 */
export async function createStripePortalSession({
  companyId,
  userEmail,
  returnUrl,
}: {
  companyId: string;
  userEmail: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripeServer();
  const customerId = await getOrCreateStripeCustomer(companyId, userEmail);

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return {
    url: portalSession.url,
  };
}

/**
 * Processes Stripe Webhook events to keep database subscription state in sync.
 */
export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<{
  received: boolean;
  type: string;
}> {
  await connectToDatabase();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const companyId = session.metadata?.companyId;

      if (companyId) {
        const company = await Company.findById(companyId);
        if (company) {
          await upgradeCompanyPlan(companyId, "PRO");

          if (session.customer) {
            company.subscription!.stripeCustomerId = session.customer.toString();
          }
          if (session.subscription) {
            company.subscription!.stripeSubscriptionId = session.subscription.toString();
          }
          company.subscription!.status = "ACTIVE";
          await company.save();
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata?.companyId;

      let company = companyId ? await Company.findById(companyId) : null;
      if (!company && subscription.customer) {
        company = await Company.findOne({
          "subscription.stripeCustomerId": subscription.customer.toString(),
        });
      }

      if (company && company.subscription) {
        company.subscription.stripeSubscriptionId = subscription.id;
        company.subscription.status =
          subscription.status === "active"
            ? "ACTIVE"
            : subscription.status === "past_due"
            ? "PAST_DUE"
            : subscription.status === "canceled"
            ? "CANCELED"
            : "ACTIVE";

        const subAny = subscription as any;
        if (subAny.current_period_start) {
          company.subscription.currentPeriodStart = new Date(
            subAny.current_period_start * 1000
          );
        }
        if (subAny.current_period_end) {
          company.subscription.currentPeriodEnd = new Date(
            subAny.current_period_end * 1000
          );
        }
        company.subscription.cancelAtPeriodEnd = Boolean(subAny.cancel_at_period_end);
        await company.save();
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata?.companyId;

      let company = companyId ? await Company.findById(companyId) : null;
      if (!company && subscription.customer) {
        company = await Company.findOne({
          "subscription.stripeCustomerId": subscription.customer.toString(),
        });
      }

      if (company) {
        await downgradeCompanyPlan(company._id);
        if (company.subscription) {
          company.subscription.status = "CANCELED";
          await company.save();
        }
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as any;
      if (invoice.subscription && invoice.customer) {
        const company = await Company.findOne({
          "subscription.stripeCustomerId": invoice.customer.toString(),
        });
        if (company && company.subscription) {
          // New monthly billing period started: roll forward and reset usage counter
          company.subscription.jobsUsedThisPeriod = 0;
          await company.save();
        }
      }
      break;
    }
  }

  return { received: true, type: event.type };
}
