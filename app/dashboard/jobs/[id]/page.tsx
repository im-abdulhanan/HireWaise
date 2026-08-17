"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Edit,
  Copy,
  Check,
  CheckCircle2,
  Sliders,
  Building,
  MapPin,
  DollarSign,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function JobOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadJob() {
      try {
        const res = await fetch(`/api/jobs/${params.id}`);
        const json = await res.json();
        if (json.success) {
          setJob(json.data);
        } else {
          router.push("/dashboard/jobs");
        }
      } catch (err) {
        console.error("Failed to load job:", err);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadJob();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-64 bg-slate-200 rounded-xl" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (!job) return null;

  const applyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/apply/${job.slug}`
      : `/apply/${job.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(applyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requiredReqs = (job.requirements || []).filter((r: any) => r.category === "REQUIRED");
  const preferredReqs = (job.requirements || []).filter((r: any) => r.category === "PREFERRED");

  const handleDeleteJob = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${job.title}"? This action cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}?hardDelete=true`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        router.push("/dashboard/jobs");
      } else {
        alert(json.error || "Failed to delete job.");
      }
    } catch (err) {
      console.error("Delete job error:", err);
      alert("Failed to delete job.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/jobs"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {job.title}
              </h1>
              <Badge variant={job.status === "PUBLISHED" ? "success" : "secondary"}>
                {job.status.toLowerCase()}
              </Badge>
              <span className="text-xs font-mono text-slate-400">
                v{job.currentScreeningVersion || 1}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              {job.department && <span>{job.department}</span>}
              <span>•</span>
              <span>{job.location || "Remote"} ({job.workplaceType?.toLowerCase()})</span>
              <span>•</span>
              <span>Created {formatDate(job.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href={`/dashboard/jobs/${job.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Edit className="h-3.5 w-3.5" />
              Edit Job
            </Button>
          </Link>

          <Link href={`/dashboard/jobs/${job.id}/candidates`}>
            <Button size="sm" className="gap-1.5 shadow-sm">
              <Users className="h-3.5 w-3.5" />
              Candidates ({job.applicationsCount || 0})
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={handleDeleteJob}
            className="gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
            title="Delete Job"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isDeleting ? "Deleting..." : "Delete"}</span>
          </Button>
        </div>
      </div>

      {/* Public Candidate Application URL Box */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-blue-950 uppercase tracking-wider">
            Public Candidate Application Link
          </p>
          <p className="text-xs font-mono text-blue-700 mt-0.5 truncate select-all">
            {applyUrl}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyLink}
            className="gap-1.5 bg-white text-xs border-blue-300 text-blue-800 hover:bg-blue-100"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </Button>

          <a href={applyUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-blue-700">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Requirements & Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Requirements */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              Configured Requirements ({job.requirements?.length || 0})
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Required Must-Haves ({requiredReqs.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {requiredReqs.map((req: any) => (
                    <span
                      key={req.id || req._id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900"
                    >
                      <span>{req.title}</span>
                      {req.minimumValue && (
                        <span className="text-[10px] text-blue-600 font-bold">
                          ({req.minimumValue} yrs)
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {preferredReqs.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Preferred / Bonus ({preferredReqs.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {preferredReqs.map((req: any) => (
                      <span
                        key={req.id || req._id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900"
                      >
                        {req.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Job Description Text */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Job Description</h3>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-lg border border-slate-100 max-h-96 overflow-y-auto">
              {job.description}
            </div>
          </div>
        </div>

        {/* Right Column: Policy & Weights Snapshot */}
        <div className="space-y-6">
          {/* Policy */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Screening Policy
            </h4>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span>Required Skills Strict Match:</span>
                <span className="font-semibold text-slate-900">
                  {job.screeningPolicy?.requiredSkillsMustMatch ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span>Minimum Exp Strict Match:</span>
                <span className="font-semibold text-slate-900">
                  {job.screeningPolicy?.minimumExperienceMustMatch ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span>Education Strict Match:</span>
                <span className="font-semibold text-slate-900">
                  {job.screeningPolicy?.educationRequired ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span>Human Review Below:</span>
                <span className="font-bold text-amber-600">
                  {job.screeningPolicy?.humanReviewBelowScore || 75}%
                </span>
              </div>
            </div>
          </div>

          {/* Scoring Weights */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600" />
              Scoring Weights
            </h4>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span>Required Skills:</span>
                <span className="font-bold text-blue-600">
                  {job.scoringWeights?.requiredSkillsWeight || 40}%
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span>Experience:</span>
                <span className="font-bold text-blue-600">
                  {job.scoringWeights?.experienceWeight || 25}%
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span>Education:</span>
                <span className="font-bold text-blue-600">
                  {job.scoringWeights?.educationWeight || 15}%
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span>Preferred Skills:</span>
                <span className="font-bold text-blue-600">
                  {job.scoringWeights?.preferredSkillsWeight || 10}%
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span>Certifications/Other:</span>
                <span className="font-bold text-blue-600">
                  {job.scoringWeights?.otherWeight || 10}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
