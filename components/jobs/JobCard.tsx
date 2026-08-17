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
  Trash2,
  AlertCircle,
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

export function JobCard({
  job,
  onDelete,
}: {
  job: JobCardData;
  onDelete?: (jobId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const applyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/apply/${job.slug}`
      : `/apply/${job.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(applyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}?hardDelete=true`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        onDelete?.(job.id);
      } else {
        alert(json.error || "Failed to delete job.");
      }
    } catch (err) {
      console.error("Delete job error:", err);
      alert("Failed to delete job. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const statusVariant =
    job.status === "PUBLISHED"
      ? "success"
      : job.status === "DRAFT"
      ? "secondary"
      : "destructive";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between relative">
      <div>
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
                {job.location || "Remote"} ({job.workplaceType?.toLowerCase()})
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
      </div>

      {/* Actions footer */}
      <div className="mt-5 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <Link href={`/dashboard/jobs/${job.id}/candidates`}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Candidates ({job.totalApplications ?? 0})</span>
          </Button>
        </Link>

        <div className="flex items-center gap-1.5">
          <Link href={`/dashboard/jobs/${job.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1 text-xs px-2.5">
              <Edit className="h-3.5 w-3.5 text-slate-500" />
              <span>Edit</span>
            </Button>
          </Link>

          <Link href={`/dashboard/jobs/${job.id}`}>
            <Button size="sm" variant="outline" className="text-xs px-2.5">
              Details
            </Button>
          </Link>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirm(true)}
            className="h-9 w-9 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete Job"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-xl p-6 z-10 flex flex-col justify-center items-center text-center animate-in fade-in-50 duration-150">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
            <Trash2 className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Delete this Job Position?</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            This will remove <strong className="text-slate-700">{job.title}</strong> and its configured screening requirements.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setShowConfirm(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDelete}
              className="gap-1.5 text-xs font-semibold"
            >
              {isDeleting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Confirm Delete</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
