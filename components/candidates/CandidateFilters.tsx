"use client";

import { Search, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CandidateFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categoryFilter: string;
  onCategoryChange: (cat: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function CandidateFilters({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
}: CandidateFiltersProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search */}
        <div className="sm:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search candidate name, email, or skill..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-slate-50/50"
          />
        </div>

        {/* AI Category Filter */}
        <div className="sm:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#19191a] outline-none"
          >
            <option value="ALL">All AI Match Categories</option>
            <option value="STRONG_MATCH">Strong Match</option>
            <option value="POSSIBLE_MATCH">Review Needed / Partial</option>
            <option value="DOES_NOT_MEET_STATED_REQUIREMENTS">Does Not Meet</option>
          </select>
        </div>

        {/* Recruiter Decision Status Filter */}
        <div className="sm:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#19191a] outline-none"
          >
            <option value="ALL">All Pipeline Statuses</option>
            <option value="NEW">New</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="INTERVIEWING">Interviewing</option>
            <option value="REJECTED">Rejected</option>
            <option value="HIRED">Hired</option>
          </select>
        </div>

        {/* Sort */}
        <div className="sm:col-span-2">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#19191a] outline-none"
          >
            <option value="score_desc">Score: High to Low</option>
            <option value="score_asc">Score: Low to High</option>
            <option value="date_desc">Newest Applied</option>
            <option value="exp_desc">Experience: High</option>
            <option value="name_asc">Candidate Name (A-Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
