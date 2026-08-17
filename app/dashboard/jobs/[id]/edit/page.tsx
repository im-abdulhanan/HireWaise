"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JobForm } from "@/components/jobs/JobForm";

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        console.error("Failed to load job for editing:", err);
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
      <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/jobs/${job.id}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Edit Job: {job.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Updating requirements or scoring weights will automatically increment the job's screening version to v{(job.currentScreeningVersion || 1) + 1}.
          </p>
        </div>
      </div>

      <JobForm initialData={job} isEditing={true} />
    </div>
  );
}
