"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  MapPin,
  Building,
  Copy,
  Check,
  Users,
  ExternalLink,
  Edit,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface JobCardData {
  id: string;
  slug: string;
  title: string;
  department?: string;
  location?: string;
  workplaceType: string;
  employmentType: string;
  status: string;
  totalApplications?: number;
  strongMatchesCount?: number;
  possibleMatchesCount?: number;
  currentScreeningVersion?: number;
}

export function JobCard({ job }: { job: JobCardData }) {
  const [copied, setCopied] = useState(false);

  const applyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/apply/${job.slug}`
      : `/apply/${job.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(applyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusVariant =
    job.status === "PUBLISHED"
      ? "success"
      : job.status === "DRAFT"
      ? "secondary"
      : "destructive";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/dashboard/jobs/${job.id}`}
              className="text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
            >
              {job.title}
            </Link>
            <Badge variant={statusVariant} className="text-[11px] capitalize">
              {job.status.toLowerCase()}
            </Badge>
            {job.currentScreeningVersion && job.currentScreeningVersion > 1 && (
              <span className="text-[10px] font-mono text-slate-400">
                v{job.currentScreeningVersion}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
            {job.department && (
              <span className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                {job.department}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {job.location || "Remote"} ({job.workplaceType.toLowerCase()})
            </span>
          </div>
        </div>

        {/* Copy Public Apply Link */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="gap-1.5 text-xs text-slate-700 shrink-0"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700">Link Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              <span>Copy Apply Link</span>
            </>
          )}
        </Button>
      </div>

      {/* Metrics Bar */}
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
        <div className="rounded-lg bg-slate-50 p-2.5 text-center">
          <p className="text-xs text-slate-500">Total Applicants</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">
            {job.totalApplications ?? 0}
          </p>
        </div>

        <div className="rounded-lg bg-emerald-50/70 p-2.5 text-center">
          <p className="text-xs text-emerald-700 font-medium">Strong Matches</p>
          <p className="text-lg font-bold text-emerald-800 mt-0.5">
            {job.strongMatchesCount ?? 0}
          </p>
        </div>

        <div className="rounded-lg bg-amber-50/70 p-2.5 text-center">
          <p className="text-xs text-amber-700 font-medium">Review Needed</p>
          <p className="text-lg font-bold text-amber-800 mt-0.5">
            {job.possibleMatchesCount ?? 0}
          </p>
        </div>
      </div>

      {/* Actions footer */}
      <div className="mt-4 flex items-center justify-between gap-2 pt-2">
        <Link href={`/dashboard/jobs/${job.id}/candidates`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            <Users className="h-3.5 w-3.5" />
            View Candidates ({job.totalApplications ?? 0})
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/dashboard/jobs/${job.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Edit className="h-3.5 w-3.5 text-slate-400" />
              Edit
            </Button>
          </Link>
          <Link href={`/dashboard/jobs/${job.id}`}>
            <Button size="sm" className="gap-1.5 text-xs">
              Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
