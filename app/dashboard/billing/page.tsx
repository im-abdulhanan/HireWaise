"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Sparkles,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Briefcase,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PlanConfig {
  id: "FREE" | "PRO";
  name: string;
  badge?: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  monthlyJobLimit: number;
  description: string;
  features: string[];
}

interface BillingUsage {
  plan: "FREE" | "PRO";
  planConfig: PlanConfig;
  status: string;
  jobsUsed: number;
  jobsLimit: number;
  jobsRemaining: number;
  canCreateJob: boolean;
  usagePercentage: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  daysRemaining: number;
  cancelAtPeriodEnd: boolean;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BillingUsage | null>(null);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadBillingData() {
    try {
      const res = await fetch("/api/billing");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data.usage);
        setPlans(json.data.plans || []);
      } else {
        setErrorMessage(json.error || "Failed to load billing data.");
      }
    } catch {
      setErrorMessage("Network error loading billing information.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBillingData();
  }, []);

  async function handleUpgrade() {
    setActionLoading("upgrade");
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "PRO" }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage(json.message || "Upgraded to Pro Plan successfully!");
        await loadBillingData();
      } else {
        setErrorMessage(json.error || "Failed to upgrade subscription.");
      }
    } catch {
      setErrorMessage("Failed to process plan upgrade. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDowngrade() {
    if (!confirm("Are you sure you want to switch to the Free Plan? Your monthly limit will be 2 jobs.")) {
      return;
    }
    setActionLoading("downgrade");
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/billing/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DOWNGRADE" }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage(json.message || "Switched to Free Plan.");
        await loadBillingData();
      } else {
        setErrorMessage(json.error || "Failed to change subscription.");
      }
    } catch {
      setErrorMessage("Failed to switch plan.");
    } finally {
      setActionLoading(null);
    }
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-44 bg-slate-200 rounded-2xl" />
          <div className="h-44 bg-slate-200 rounded-2xl" />
        </div>
        <div className="h-96 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  const isPro = data?.plan === "PRO";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <CreditCard className="h-6 w-6 text-[#19191a]" />
          <span>Billing & Monthly Job Usage</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your subscription tier, track monthly job limits, and scale your recruiter workspace.
        </p>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-900 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top 2 Cards Grid: Current Plan & Monthly Job Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Active Subscription Plan */}
        <div
          className={`rounded-2xl border p-6 flex flex-col justify-between shadow-xs transition-all ${
            isPro
              ? "border-purple-200/80 bg-purple-50/40"
              : "border-slate-200 bg-white"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Subscription
              </span>
              {isPro ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  <Sparkles className="h-3 w-3 text-purple-600" />
                  Pro Tier ($10/mo)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Free Tier ($0/mo)
                </span>
              )}
            </div>

            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isPro ? "$10" : "$0"}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ month</span>
            </div>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {isPro
                ? "You are currently subscribed to the Pro Plan with priority screening and up to 50 jobs per month."
                : "You are on the Free Plan with standard features and up to 2 jobs per month."}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Resets on: <strong className="text-slate-800">{formatDate(data?.currentPeriodEnd)}</strong>
              </span>
            </div>
            <span className="text-slate-500">
              {data?.daysRemaining ?? 0} day{(data?.daysRemaining ?? 0) === 1 ? "" : "s"} left
            </span>
          </div>
        </div>

        {/* Card 2: Monthly Job Usage & Limit Progress */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Monthly Job Usage
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                  (data?.usagePercentage ?? 0) >= 100
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : (data?.usagePercentage ?? 0) >= 80
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}
              >
                {data?.jobsUsed ?? 0} / {data?.jobsLimit ?? 2} Jobs Used
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {data?.jobsRemaining ?? 0}
                </span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">remaining</span>
              </div>
              <span className="text-xs font-bold text-slate-700">
                {data?.usagePercentage ?? 0}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (data?.usagePercentage ?? 0) >= 100
                    ? "bg-rose-500"
                    : (data?.usagePercentage ?? 0) >= 80
                    ? "bg-amber-500"
                    : isPro
                    ? "bg-purple-600"
                    : "bg-[#19191a]"
                }`}
                style={{ width: `${Math.min(100, data?.usagePercentage ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            {!data?.canCreateJob ? (
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Monthly job limit reached</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  {isPro
                    ? "You've used all 50 job postings available on your Pro plan for this period."
                    : "You've used all 2 job postings available on your Free plan. Upgrade to Pro for up to 50 job postings per month."}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Job quotas reset automatically at the end of every 30-day billing cycle.
              </p>
            )}

            {!isPro && (
              <Button
                size="sm"
                onClick={handleUpgrade}
                disabled={actionLoading === "upgrade"}
                className="gap-1 text-xs bg-[#19191a] hover:bg-black text-white shrink-0 ml-2"
              >
                {actionLoading === "upgrade" ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Upgrade</span>
                    <Sparkles className="h-3 w-3 text-purple-300" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Plan Comparison Section */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Available Subscription Plans</h2>
          <p className="text-xs text-slate-500">
            Choose the plan that best aligns with your hiring volume. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* FREE PLAN TIER CARD */}
          <div
            className={`rounded-2xl border p-6 sm:p-8 flex flex-col justify-between transition-all ${
              !isPro
                ? "border border-slate-300 bg-white shadow-sm relative"
                : "border border-slate-200 bg-slate-50/50 hover:bg-white"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Free Plan</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For small teams and testing AI candidate screening.
                  </p>
                </div>
                {!isPro && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                    Current Plan
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">$0</span>
                <span className="text-xs text-slate-500 font-medium">/ month</span>
              </div>

              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Up to 2 Active Jobs</strong> per month</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-slate-700">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Deterministic Matching & AI Parsing</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-slate-700">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Evidence Citations & Verbatim Quotes</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-slate-700">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>17-Column Google Sheets Sync</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-slate-700">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>1 Recruiter Seat</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              {!isPro ? (
                <Button disabled className="w-full text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200">
                  Current Plan
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleDowngrade}
                  disabled={Boolean(actionLoading)}
                  className="w-full text-xs font-semibold hover:bg-slate-100"
                >
                  {actionLoading === "downgrade" ? "Switching..." : "Switch to Free Plan"}
                </Button>
              )}
            </div>
          </div>

          {/* PRO PLAN TIER CARD */}
          <div
            className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
              isPro
                ? "border border-neutral-700 bg-black text-white shadow-xl relative"
                : "border border-neutral-800 bg-neutral-950 text-white shadow-lg relative"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Pro Plan</h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20">
                      <Sparkles className="h-2.5 w-2.5 text-purple-300" />
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    For recruiters and growing teams needing higher screening volume.
                  </p>
                </div>
                {isPro && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 shadow-xs">
                    Active
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">$10</span>
                <span className="text-xs text-neutral-400 font-medium">/ month</span>
              </div>

              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2.5 text-xs text-neutral-200 font-semibold">
                  <Check className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Up to 50 Active Jobs</strong> per month</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-neutral-300">
                  <Check className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Priority AI Screening Evaluation Queue</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-neutral-300">
                  <Check className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Custom Scoring Weights & Strict Policies</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-neutral-300">
                  <Check className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Full Evidence Verification Engine</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-neutral-300">
                  <Check className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Automatic Real-Time Google Sheets Sync</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-neutral-300">
                  <Check className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Unlimited Recruiter Seats & Candidate Notes</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-800">
              {isPro ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-300 font-semibold">Your current active plan</span>
                  <Button disabled className="text-xs font-bold bg-white/20 text-white">
                    Subscribed
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleUpgrade}
                  disabled={Boolean(actionLoading)}
                  className="w-full text-xs font-bold bg-white text-black hover:bg-neutral-200 shadow-md py-3 gap-1.5"
                >
                  {actionLoading === "upgrade" ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  ) : (
                    <>
                      <span>Upgrade to Pro ($10/mo)</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stripe & Invoices Architecture Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payment & Invoice History</h3>
              <p className="text-xs text-slate-500">
                All subscriptions include 256-bit encrypted checkout and automated invoices.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
            PCI Compliant
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">
              {isPro ? "HireWise Pro Plan Subscription" : "HireWise Free Tier"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Cycle: {formatDate(data?.currentPeriodStart)} — {formatDate(data?.currentPeriodEnd)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-900">{isPro ? "$10.00 USD" : "$0.00 USD"}</p>
            <span className="text-[10px] font-semibold text-emerald-600">PAID</span>
          </div>
        </div>
      </div>
    </div>
  );
}
