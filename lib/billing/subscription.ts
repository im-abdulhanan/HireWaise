import { Types } from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Company, { ICompany } from "@/models/Company";
import Job from "@/models/Job";
import {
  PlanTier,
  PlanConfig,
  getPlanConfig,
  getLimitExceededMessage,
  SUBSCRIPTION_PLANS,
} from "./plans";

export interface CompanyJobUsage {
  plan: PlanTier;
  planConfig: PlanConfig;
  status: string;
  jobsUsed: number;
  jobsLimit: number;
  jobsRemaining: number;
  canCreateJob: boolean;
  usagePercentage: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  daysRemaining: number;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

/**
 * Calculates default 30-day billing period dates from a reference date.
 */
export function calculateBillingPeriod(referenceDate: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(referenceDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return { start, end };
}

/**
 * Retrieves and ensures valid subscription state for a company.
 * Rolls the billing period forward if the active cycle has elapsed.
 */
export async function getCompanySubscription(
  companyId: string | Types.ObjectId
): Promise<ICompany> {
  await connectToDatabase();

  let company = await Company.findById(companyId);
  if (!company) {
    throw new Error(`Company with ID ${companyId} not found.`);
  }

  const now = new Date();

  // If company has no subscription or missing period dates, initialize default FREE plan
  if (!company.subscription || !company.subscription.currentPeriodStart || !company.subscription.currentPeriodEnd) {
    const { start, end } = calculateBillingPeriod(now);
    company.subscription = {
      plan: "FREE",
      status: "ACTIVE",
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
    };
    await company.save();
    return company;
  }

  // If billing cycle has expired, roll forward the 30-day cycle
  if (now > new Date(company.subscription.currentPeriodEnd)) {
    let periodStart = new Date(company.subscription.currentPeriodEnd);
    // If it expired long ago, reset start to now
    if (now.getTime() - periodStart.getTime() > 30 * 24 * 60 * 60 * 1000) {
      periodStart = now;
    }
    const { start, end } = calculateBillingPeriod(periodStart);
    company.subscription.currentPeriodStart = start;
    company.subscription.currentPeriodEnd = end;
    await company.save();
  }

  return company;
}

/**
 * Calculates current job usage against the monthly limit for a company.
 */
export async function getCompanyJobUsage(
  companyId: string | Types.ObjectId
): Promise<CompanyJobUsage> {
  await connectToDatabase();

  const company = await getCompanySubscription(companyId);
  const sub = company.subscription!;
  const planConfig = getPlanConfig(sub.plan);

  const periodStart = new Date(sub.currentPeriodStart);
  const periodEnd = new Date(sub.currentPeriodEnd);

  // Count jobs created in current billing window
  const jobsUsed = await Job.countDocuments({
    companyId: company._id,
    createdAt: {
      $gte: periodStart,
      $lte: periodEnd,
    },
  });

  const jobsLimit = planConfig.monthlyJobLimit;
  const jobsRemaining = Math.max(0, jobsLimit - jobsUsed);
  const canCreateJob = jobsUsed < jobsLimit;
  const usagePercentage = Math.min(100, Math.round((jobsUsed / jobsLimit) * 100));

  const now = new Date();
  const diffTime = periodEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return {
    plan: sub.plan,
    planConfig,
    status: sub.status || "ACTIVE",
    jobsUsed,
    jobsLimit,
    jobsRemaining,
    canCreateJob,
    usagePercentage,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    daysRemaining,
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
    stripeCustomerId: sub.stripeCustomerId,
    stripeSubscriptionId: sub.stripeSubscriptionId,
  };
}

/**
 * Server-side guard: validates if the company is allowed to create another job.
 */
export async function assertCanCreateJob(
  companyId: string | Types.ObjectId
): Promise<{
  allowed: boolean;
  reason?: string;
  usage: CompanyJobUsage;
}> {
  const usage = await getCompanyJobUsage(companyId);

  if (!usage.canCreateJob) {
    return {
      allowed: false,
      reason: getLimitExceededMessage(),
      usage,
    };
  }

  return {
    allowed: true,
    usage,
  };
}

/**
 * Upgrades a company to the PRO plan ($10/mo, 50 jobs).
 */
export async function upgradeCompanyPlan(
  companyId: string | Types.ObjectId,
  targetPlan: PlanTier = "PRO"
): Promise<CompanyJobUsage> {
  await connectToDatabase();

  const company = await getCompanySubscription(companyId);
  const existingStart = company.subscription?.currentPeriodStart || new Date();
  const existingEnd =
    company.subscription?.currentPeriodEnd || calculateBillingPeriod(existingStart).end;

  company.subscription = {
    plan: targetPlan,
    status: "ACTIVE",
    currentPeriodStart: existingStart,
    currentPeriodEnd: existingEnd,
    cancelAtPeriodEnd: false,
    stripeCustomerId: company.subscription?.stripeCustomerId,
    stripeSubscriptionId: company.subscription?.stripeSubscriptionId,
  };

  await company.save();
  return getCompanyJobUsage(companyId);
}

/**
 * Downgrades a company back to the FREE plan ($0/mo, 2 jobs).
 */
export async function downgradeCompanyPlan(
  companyId: string | Types.ObjectId
): Promise<CompanyJobUsage> {
  await connectToDatabase();

  const company = await getCompanySubscription(companyId);
  const existingStart = company.subscription?.currentPeriodStart || new Date();
  const existingEnd =
    company.subscription?.currentPeriodEnd || calculateBillingPeriod(existingStart).end;

  company.subscription = {
    plan: "FREE",
    status: "ACTIVE",
    currentPeriodStart: existingStart,
    currentPeriodEnd: existingEnd,
    cancelAtPeriodEnd: false,
    stripeCustomerId: company.subscription?.stripeCustomerId,
    stripeSubscriptionId: company.subscription?.stripeSubscriptionId,
  };

  await company.save();
  return getCompanyJobUsage(companyId);
}
