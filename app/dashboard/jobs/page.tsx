"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Briefcase, Filter, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobCard, JobCardData } from "@/components/jobs/JobCard";

export default function JobsListPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT" | "ARCHIVED">("ALL");
  const [billing, setBilling] = useState<{
    plan: "FREE" | "PRO";
    jobsUsed: number;
    jobsLimit: number;
    jobsRemaining: number;
    canCreateJob: boolean;
  } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes, billingRes] = await Promise.all([
          fetch("/api/jobs"),
          fetch("/api/billing").catch(() => null),
        ]);

        const jobsJson = await jobsRes.json();
        if (jobsJson.success) {
          setJobs(jobsJson.data || []);
        }

        if (billingRes) {
          const billingJson = await billingRes.json();
          if (billingJson.success && billingJson.data?.usage) {
            setBilling(billingJson.data.usage);
          }
        }
      } catch (err) {
        console.error("Failed to load jobs data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Restore scroll position when returning from Candidates or Details
  useEffect(() => {
    if (!loading && typeof window !== "undefined") {
      const savedScroll = sessionStorage.getItem("jobs_studio_scroll_y");
      if (savedScroll) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo({ top: Number(savedScroll), behavior: "instant" });
          }, 50);
        });
      }
    }
  }, [loading]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.department && job.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ? true : job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Jobs Studio</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your hiring positions, configure AI screening policies, and monitor candidate pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {billing && (
            <span className="hidden sm:inline-flex text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl">
              {billing.jobsUsed} / {billing.jobsLimit} jobs used
            </span>
          )}

          <Link href={billing && !billing.canCreateJob ? "/dashboard/billing" : "/dashboard/jobs/new"}>
            <Button className="gap-2 shadow-sm">
              {billing && !billing.canCreateJob ? (
                <>
                  <Sparkles className="h-4 w-4 text-purple-300" />
                  <span>Upgrade to Post Job</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create New Job</span>
                </>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* Plan Limit Alert if Free Limit Reached */}
      {billing && !billing.canCreateJob && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-purple-200 bg-purple-50/80 p-4 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
            <div>
              <p className="font-bold text-purple-950">
                You've reached your monthly limit of {billing.jobsLimit} jobs on the Free Plan.
              </p>
              <p className="text-purple-800 mt-0.5">
                Upgrade to Pro ($10/mo) to post up to 50 jobs per month with priority screening.
              </p>
            </div>
          </div>
          <Link href="/dashboard/billing">
            <Button size="sm" className="bg-[#19191a] hover:bg-black text-white text-xs font-bold gap-1 shrink-0">
              <span>Upgrade to Pro</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search jobs by title, department, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50/50 border-slate-200"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === status
                  ? "bg-[#19191a] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {status === "ALL" ? "All Jobs" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Job Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-56 rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <Briefcase className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No jobs found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No jobs match your search "${searchQuery}". Try clearing filters.`
              : "Get started by creating your first job opening."}
          </p>
          {!searchQuery && (
            <div className="mt-5">
              <Link href="/dashboard/jobs/new">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Create Job
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onDelete={(id) => setJobs((prev) => prev.filter((j) => j.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
