"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  ArrowRight,
  Sparkles,
  Search,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    strongMatches: 0,
    needsReview: 0,
    failures: 0,
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [jobsRes, candidatesRes] = await Promise.all([
          fetch("/api/jobs"),
          fetch("/api/candidates?limit=6"),
        ]);

        const jobsJson = await jobsRes.json();
        const candidatesJson = await candidatesRes.json();

        const loadedJobs = jobsJson.data || [];
        const loadedCandidates = candidatesJson.data || [];

        setJobs(loadedJobs);
        setRecentApplications(loadedCandidates);

        // Compute metrics
        const activeJobsCount = loadedJobs.filter((j: any) => j.status === "PUBLISHED").length;
        const totalApps = loadedJobs.reduce((acc: number, j: any) => acc + (j.totalApplications || 0), 0);
        const strongMatchesCount = loadedJobs.reduce((acc: number, j: any) => acc + (j.strongMatchesCount || 0), 0);
        const needsReviewCount = loadedJobs.reduce((acc: number, j: any) => acc + (j.possibleMatchesCount || 0), 0);

        setStats({
          activeJobs: activeJobsCount,
          totalApplications: totalApps,
          strongMatches: strongMatchesCount,
          needsReview: needsReviewCount,
          failures: 0,
        });
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  const hasNoJobs = jobs.length === 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recruiter Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time candidate screening activity, match categories, and job pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/integrations/google">
            <Button variant="outline" size="sm" className="gap-1.5 shadow-xs">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Google Sheets</span>
            </Button>
          </Link>

          <Link href="/dashboard/jobs/new">
            <Button size="sm" className="gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Create Job</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Jobs
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[#19191a]">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-3">{stats.activeJobs}</p>
          <p className="text-xs text-slate-500 mt-1">
            {jobs.length} total job positions
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Applications
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[#19191a]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-3">{stats.totalApplications}</p>
          <p className="text-xs text-slate-500 mt-1">
            Processed through screening engine
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Strong Matches
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-900 mt-3">{stats.strongMatches}</p>
          <p className="text-xs text-emerald-700 mt-1">
            High qualification confidence
          </p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Needs Review
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-3">{stats.needsReview}</p>
          <p className="text-xs text-amber-700 mt-1">
            Partial matches & edge qualifications
          </p>
        </div>
      </div>

      {/* Empty State when no jobs exist */}
      {hasNoJobs ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-[#19191a] shadow-inner mb-4">
            <Briefcase className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Jobs Created Yet</h3>
          <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
            Create your first job position, use AI to automatically extract requirements, and share the public application link.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/dashboard/jobs/new">
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>Create Your First Job</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Candidates Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Recent Applications</h3>
              <Link href="/dashboard/candidates" className="text-xs font-semibold text-[#19191a] hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {recentApplications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-medium text-slate-700">No candidate submissions yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Share your job application links with prospective candidates to start screening.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Candidate</th>
                        <th className="px-4 py-3">Job Role</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">AI Category</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {recentApplications.map((app: any) => (
                        <tr key={app.id || app._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-900">{app.candidate?.name || app.name || "Candidate"}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{app.candidate?.email || app.email}</p>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-800">
                            {app.job?.title || "Engineering Role"}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-900 text-sm">
                              {app.screeningResult?.overallScore ?? "—"}
                            </span>
                            {app.screeningResult?.overallScore && <span className="text-[10px] text-slate-400">/100</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            {app.screeningResult?.category === "STRONG_MATCH" ? (
                              <Badge variant="strongMatch" className="text-[10px]">Strong Match</Badge>
                            ) : app.screeningResult?.category === "POSSIBLE_MATCH" ? (
                              <Badge variant="possibleMatch" className="text-[10px]">Review Needed</Badge>
                            ) : app.screeningResult?.category === "DOES_NOT_MEET_STATED_REQUIREMENTS" ? (
                              <Badge variant="doesNotMeet" className="text-[10px]">Does Not Meet</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 uppercase">
                              {app.status || "NEW"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Link href={`/dashboard/jobs/${app.jobId || app.job?._id}/candidates/${app.candidateId || app.candidate?._id || app.id}?from=dashboard`}>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-[#19191a] hover:text-black">
                                Review
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Active Job Pipelines Widget */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Active Jobs</h3>
              <Link href="/dashboard/jobs" className="text-xs font-semibold text-[#19191a] hover:underline">
                View Studio
              </Link>
            </div>

            <div className="space-y-3">
              {jobs.slice(0, 4).map((job: any) => (
                <div
                  key={job.id || job._id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/dashboard/jobs/${job.id || job._id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-[#19191a] transition-colors line-clamp-1"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {job.department || "General"} • {job.location || "Remote"}
                      </p>
                    </div>
                    <Badge variant={job.status === "PUBLISHED" ? "success" : "secondary"} className="text-[10px]">
                      {job.status.toLowerCase()}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-medium">
                      {job.totalApplications || 0} candidates
                    </span>
                    <Link
                      href={`/dashboard/jobs/${job.id || job._id}/candidates?from=dashboard`}
                      className="text-[#19191a] font-semibold hover:underline"
                    >
                      View list →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
