/**
 * Centralized Subscription Plans Configuration for HireWise SaaS
 * Single source of truth used across frontend, backend, validation, and billing views.
 */

export type PlanTier = "FREE" | "PRO";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";

export interface PlanConfig {
  id: PlanTier;
  name: string;
  badge?: string;
  price: number; // in USD
  currency: string;
  interval: "month" | "year";
  monthlyJobLimit: number;
  description: string;
  features: string[];
  stripePriceId?: string;
}

export const SUBSCRIPTION_PLANS: Record<PlanTier, PlanConfig> = {
  FREE: {
    id: "FREE",
    name: "Free Plan",
    price: 0,
    currency: "USD",
    interval: "month",
    monthlyJobLimit: 2,
    description: "For small teams and testing AI candidate screening.",
    features: [
      "Up to 2 Active Jobs per month",
      "Deterministic Matching & AI Parsing",
      "Evidence Citations & Reasonings",
      "17-Column Google Sheets Sync",
      "1 Recruiter Seat",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro Plan",
    badge: "Recommended",
    price: 10,
    currency: "USD",
    interval: "month",
    monthlyJobLimit: 50,
    description: "For recruiters and growing teams needing higher screening volume.",
    features: [
      "Up to 50 Active Jobs per month",
      "Priority AI Evaluation Processing",
      "Custom Scoring Weights & Strict Policies",
      "Evidence Verification Engine",
      "Automatic Real-Time Google Sheets Sync",
      "Unlimited Recruiter Seats",
      "Candidate Notes & Human Decision Audits",
    ],
  },
};

/**
 * Gets the configuration for a given plan tier.
 */
export function getPlanConfig(tier: string | undefined | null): PlanConfig {
  if (tier === "PRO") {
    return SUBSCRIPTION_PLANS.PRO;
  }
  return SUBSCRIPTION_PLANS.FREE;
}

/**
 * Returns all available plans in display order.
 */
export function getAllPlans(): PlanConfig[] {
  return [SUBSCRIPTION_PLANS.FREE, SUBSCRIPTION_PLANS.PRO];
}

/**
 * Standard limit exceeded message.
 */
export function getLimitExceededMessage(plan?: PlanTier | string): string {
  if (plan === "PRO") {
    return "Monthly job limit reached. You've used all 50 job postings available on your Pro plan for this monthly period. Quota will reset on your next billing date.";
  }
  return "Monthly job limit reached. You've used all 2 job postings available on your Free plan. Upgrade to Pro for up to 50 job postings per month.";
}
