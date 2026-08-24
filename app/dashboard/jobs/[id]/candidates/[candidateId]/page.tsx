"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { CandidateDetailView } from "@/components/candidates/CandidateDetailView";

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getBackUrl = () => {
    if (from === "all_candidates") {
      return "/dashboard/candidates";
    }
    if (from) {
      return `/dashboard/jobs/${params.id}/candidates?from=${encodeURIComponent(from)}`;
    }
    return `/dashboard/jobs/${params.id}/candidates`;
  };

  useEffect(() => {
    async function loadCandidate() {
      try {
        const url = params.id
          ? `/api/candidates/${params.candidateId}?jobId=${params.id}`
          : `/api/candidates/${params.candidateId}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || "Candidate not found.");
        }
      } catch (err: any) {
        setError("Failed to load candidate details.");
      } finally {
        setLoading(false);
      }
    }

    if (params.candidateId) {
      loadCandidate();
    }
  }, [params.candidateId, params.id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-44 bg-slate-200 rounded-2xl" />
        <div className="h-96 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <User className="mx-auto h-12 w-12 text-slate-400 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Candidate Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          {error || "The requested candidate profile does not exist or you do not have permission to view it."}
        </p>
        <Link href={getBackUrl()}>
          <button className="text-xs font-semibold text-[#19191a] hover:underline">
            ← Return to Candidates
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href={getBackUrl()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="Back to Candidates"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-slate-500">
            Job: <span className="font-semibold text-slate-800">{data.job?.title}</span>
          </p>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Candidate Evidence & Screening Audit
          </h1>
        </div>
      </div>

      <CandidateDetailView data={data} />
    </div>
  );
}
