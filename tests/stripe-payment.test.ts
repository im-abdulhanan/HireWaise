import fs from "fs";
import path from "path";

// Load .env / .env.local file
for (const envFile of [".env.local", ".env"]) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const idx = trimmed.indexOf("=");
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import mongoose, { Types } from "mongoose";
import connectToDatabase from "../lib/db/mongodb";
import Company from "../models/Company";
import {
  getStripeServer,
  getOrCreateStripeCustomer,
  createStripeCheckoutSession,
  handleStripeWebhookEvent,
} from "../lib/stripe/stripe";
import { getCompanyJobUsage } from "../lib/billing/subscription";
import Stripe from "stripe";

async function runStripePaymentTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING STRIPE PAYMENT INTEGRATION TESTS");
  console.log("==================================================\n");

  await connectToDatabase();

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      testPassed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      testFailed++;
    }
  }

  // --- TEST SUITE 1: Stripe Keys & SDK Initialization ---
  console.log("📋 Test Suite 1: Stripe Credentials & Client Initialization");
  const pubKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const secKey = process.env.STRIPE_SECRET_KEY;

  assert(
    Boolean(pubKey && pubKey.startsWith("pk_test_")),
    `Stripe Publishable Key configured properly (${pubKey?.substring(0, 15)}...)`
  );
  assert(
    Boolean(secKey && secKey.startsWith("sk_test_")),
    `Stripe Secret Key configured properly (${secKey?.substring(0, 15)}...)`
  );

  const stripe = getStripeServer();
  assert(
    Boolean(stripe && typeof stripe.checkout?.sessions?.create === "function"),
    "Stripe server SDK initialized successfully with checkout API support"
  );

  // --- TEST SUITE 2: Customer Creation & Checkout Session ---
  console.log("\n💳 Test Suite 2: Stripe Customer & Checkout Session Generation");
  const testCompanySlug = `stripe-test-${Date.now()}`;
  const testCompany = await Company.create({
    name: "Stripe Test Corp",
    slug: testCompanySlug,
    settings: { retentionDays: 365, allowPublicApplications: true, autoSyncSheets: true },
    subscription: {
      plan: "FREE",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      jobsUsedThisPeriod: 2, // Free user used 2/2 jobs
      cancelAtPeriodEnd: false,
    },
  });

  const checkoutResult = await createStripeCheckoutSession({
    companyId: testCompany._id.toString(),
    companyName: testCompany.name,
    userEmail: "recruiter@example.com",
    returnUrl: "http://localhost:3000/dashboard/billing",
  });

  assert(
    Boolean(checkoutResult.sessionId && checkoutResult.sessionId.startsWith("cs_test_")),
    `Checkout session created with Stripe session ID (${checkoutResult.sessionId?.substring(0, 15)}...)`
  );
  assert(
    Boolean(checkoutResult.url && checkoutResult.url.includes("checkout.stripe.com")),
    "Checkout session URL points to secure Stripe hosted checkout"
  );

  // Verify Stripe Customer ID was linked to Company
  const updatedCompanyAfterCheckout = await Company.findById(testCompany._id);
  assert(
    Boolean(updatedCompanyAfterCheckout?.subscription?.stripeCustomerId?.startsWith("cus_")),
    `Stripe Customer ID linked to company (${updatedCompanyAfterCheckout?.subscription?.stripeCustomerId})`
  );

  // --- TEST SUITE 3: Webhook Event Processing (Checkout Completed) ---
  console.log("\n⚡ Test Suite 3: Webhook checkout.session.completed Processing");
  const mockCheckoutEvent: Stripe.Event = {
    id: `evt_test_${Date.now()}`,
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    data: {
      object: {
        id: checkoutResult.sessionId,
        object: "checkout.session",
        customer: updatedCompanyAfterCheckout?.subscription?.stripeCustomerId,
        subscription: "sub_test_mock_123456",
        metadata: {
          companyId: testCompany._id.toString(),
          plan: "PRO",
        },
      } as any,
    },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  };

  const webhookResult = await handleStripeWebhookEvent(mockCheckoutEvent);
  assert(
    webhookResult.received === true && webhookResult.type === "checkout.session.completed",
    "Webhook event processed successfully"
  );

  // Verify company subscription upgraded to PRO and preserved consumed jobs
  const usageAfterWebhook = await getCompanyJobUsage(testCompany._id);
  assert(
    usageAfterWebhook.plan === "PRO",
    "Company subscription upgraded to 'PRO' tier"
  );
  assert(
    usageAfterWebhook.jobsLimit === 50,
    "Monthly limit expanded to 50 jobs"
  );
  assert(
    usageAfterWebhook.jobsUsed === 2 && usageAfterWebhook.jobsRemaining === 48,
    "Consumed quota preserved: 2/50 used, 48 remaining"
  );

  // --- TEST SUITE 4: Webhook customer.subscription.deleted (Downgrade) ---
  console.log("\n🔄 Test Suite 4: Webhook customer.subscription.deleted Processing");
  const mockDeleteEvent: Stripe.Event = {
    id: `evt_test_del_${Date.now()}`,
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: "sub_test_mock_123456",
        object: "subscription",
        customer: updatedCompanyAfterCheckout?.subscription?.stripeCustomerId,
        metadata: {
          companyId: testCompany._id.toString(),
        },
        status: "canceled",
      } as any,
    },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  };

  await handleStripeWebhookEvent(mockDeleteEvent);
  const usageAfterDelete = await getCompanyJobUsage(testCompany._id);

  assert(
    usageAfterDelete.plan === "FREE" && usageAfterDelete.jobsLimit === 2,
    "Company downgraded back to FREE plan upon Stripe subscription deletion"
  );

  // Cleanup test resources
  console.log("\n🧹 Cleaning up test database fixtures...");
  await Company.findByIdAndDelete(testCompany._id);

  console.log("\n==================================================");
  console.log(`📊 TEST RESULTS: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("==================================================");

  if (testFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStripePaymentTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
