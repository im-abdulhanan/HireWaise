"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CandidateFilters } from "@/components/candidates/CandidateFilters";
import { formatDate } from "@/lib/utils";

export default function JobCandidatesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [job, setJob] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("score_desc");

  useEffect(() => {
    async function loadJobAndCandidates() {
      try {
        const [jobRes, candRes] = await Promise.all([
          fetch(`/api/jobs/${params.id}`),
          fetch(`/api/candidates?jobId=${params.id}`),
        ]);

        const jobJson = await jobRes.json();
        const candJson = await candRes.json();

        if (jobJson.success) setJob(jobJson.data);
        if (candJson.success) setCandidates(candJson.data || []);
      } catch (err) {
        console.error("Failed to load job candidates:", err);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadJobAndCandidates();
    }
  }, [params.id]);

  const filteredCandidates = candidates
    .filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.candidate?.skills &&
          c.candidate.skills.some((s: string) => s.toLowerCase().includes(q)));

      const matchesCat =
        categoryFilter === "ALL" ||
        c.screeningResult?.category === categoryFilter;

      const matchesStatus =
        statusFilter === "ALL" || c.status === statusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "score_desc") {
        return (b.screeningResult?.overallScore || 0) - (a.screeningResult?.overallScore || 0);
      }
      if (sortBy === "score_asc") {
        return (a.screeningResult?.overallScore || 0) - (b.screeningResult?.overallScore || 0);
      }
      if (sortBy === "date_desc") {
        return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
      }
      if (sortBy === "exp_desc") {
        return (
          (b.candidate?.totalExperienceYears || 0) -
          (a.candidate?.totalExperienceYears || 0)
        );
      }
      return 0;
    });

  const getBackUrl = () => {
    if (from === "jobs") {
      return "/dashboard/jobs";
    }
    if (from === "details") {
      return `/dashboard/jobs/${params.id}`;
    }
    if (from === "dashboard") {
      return "/dashboard";
    }
    if (from === "all_candidates") {
      return "/dashboard/candidates";
    }
    // Safe default fallback
    return `/dashboard/jobs/${params.id}`;
  };

  const getCandidateDetailUrl = (candRefId: string) => {
    if (from) {
      return `/dashboard/jobs/${params.id}/candidates/${candRefId}?from=${encodeURIComponent(from)}`;
    }
    return `/dashboard/jobs/${params.id}/candidates/${candRefId}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-16 bg-slate-200 rounded-xl" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={getBackUrl()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title={from === "jobs" ? "Back to Jobs Studio" : "Back to Job Details"}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {job?.title || "Job"} — Candidates
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {candidates.length} total applicant{candidates.length === 1 ? "" : "s"} screened against job requirements.
            </p>
          </div>
        </div>

        <Link href={`/dashboard/jobs/${params.id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            Job Overview & Policy
          </Button>
        </Link>
      </div>

      {/* Filter Controls */}
      <CandidateFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Table */}
      {filteredCandidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <Users className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No candidates found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || categoryFilter !== "ALL"
              ? "No applicants match your active search filters."
              : "Share your job application link to start receiving candidates."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Candidate</th>
                  <th className="px-5 py-3.5 text-center">Match Score</th>
                  <th className="px-5 py-3.5">AI Category</th>
                  <th className="px-5 py-3.5">Required Skills</th>
                  <th className="px-5 py-3.5">Experience</th>
                  <th className="px-5 py-3.5">Recruiter Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCandidates.map((c) => {
                  const score = c.screeningResult?.overallScore;
                  const cat = c.screeningResult?.category;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={getCandidateDetailUrl(c.candidateId || c.id)}
                          className="font-bold text-slate-900 hover:text-[#19191a] transition-colors text-sm"
                        >
                          {c.name}
                        </Link>
                        <p className="text-[11px] text-slate-400 mt-0.5">{c.email}</p>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {score !== undefined ? (
                          <span
                            className={`inline-flex h-8 w-11 items-center justify-center rounded-lg font-bold text-xs ${
                              score >= 80
                                ? "bg-emerald-100 text-emerald-800"
                                : score >= 60
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {score}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {c.screeningStatus === "FAILED" ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Failed
                          </Badge>
                        ) : cat === "STRONG_MATCH" ? (
                          <Badge variant="strongMatch" className="text-[10px]">
                            Strong Match
                          </Badge>
                        ) : cat === "POSSIBLE_MATCH" ? (
                          <Badge variant="possibleMatch" className="text-[10px]">
                            Review Needed
                          </Badge>
                        ) : cat === "DOES_NOT_MEET_STATED_REQUIREMENTS" ? (
                          <Badge variant="doesNotMeet" className="text-[10px]">
                            Does Not Meet
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Processing
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {c.screeningResult ? (
                          <span className="text-xs font-semibold text-slate-800">
                            {c.screeningResult.matchedRequiredSkillsCount} /{" "}
                            {c.screeningResult.totalRequiredSkillsCount}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 font-mono text-slate-700">
                        {c.candidate?.totalExperienceYears ? `${c.candidate.totalExperienceYears} yrs` : "N/A"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {c.status || "NEW"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={getCandidateDetailUrl(c.candidateId || c.id)}
                        >
                          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-[#19191a] hover:text-black">
                            <span>Evidence</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
