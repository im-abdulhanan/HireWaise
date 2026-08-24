"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CandidateFilters } from "@/components/candidates/CandidateFilters";
import { formatDate } from "@/lib/utils";

export default function GlobalCandidatesPage() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<any[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("score_desc");

  useEffect(() => {
    async function loadCandidates() {
      try {
        const res = await fetch("/api/candidates");
        const json = await res.json();
        if (json.success) {
          setCandidates(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch candidates:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCandidates();
  }, []);

  // Filter & sort logic
  const filteredCandidates = candidates
    .filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.job?.title && c.job.title.toLowerCase().includes(q)) ||
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
      if (sortBy === "name_asc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return 0;
    });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Global Candidates
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review, filter, and audit screening results across all active job positions.
        </p>
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

      {/* Candidates Table */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 rounded-lg" />
          ))}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <Users className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No candidates match filters</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
              ? "Try adjusting your search criteria or resetting filters."
              : "Candidates will appear here once they apply to your open job positions."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Candidate</th>
                  <th className="px-5 py-3.5">Job Role</th>
                  <th className="px-5 py-3.5 text-center">Score</th>
                  <th className="px-5 py-3.5">AI Category</th>
                  <th className="px-5 py-3.5">Key Skills Matched</th>
                  <th className="px-5 py-3.5">Recruiter Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCandidates.map((c) => {
                  const score = c.screeningResult?.overallScore;
                  const cat = c.screeningResult?.category;

                  return (
                    <tr
                      key={c.id || c.applicationId}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/jobs/${c.jobId || c.job?.id}/candidates/${c.candidateId || c.id}?from=all_candidates`}
                          className="font-bold text-slate-900 hover:text-[#19191a] transition-colors text-sm"
                        >
                          {c.name}
                        </Link>
                        <p className="text-[11px] text-slate-400 mt-0.5">{c.email}</p>
                        {c.candidate?.totalExperienceYears ? (
                          <span className="inline-block text-[10px] text-slate-500 font-mono mt-1">
                            {c.candidate.totalExperienceYears} yrs experience
                          </span>
                        ) : null}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-800">
                        {c.job?.title || "Engineering Role"}
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
                            {c.screeningResult.totalRequiredSkillsCount} Required
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Pending</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {c.status || "NEW"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/jobs/${c.jobId || c.job?.id}/candidates/${c.candidateId || c.id}?from=all_candidates`}
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
