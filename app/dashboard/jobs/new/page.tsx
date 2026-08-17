import { JobForm } from "@/components/jobs/JobForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewJobPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/jobs"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Create New Job
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure job description, AI requirement extraction, and custom screening weights.
          </p>
        </div>
      </div>

      <JobForm />
    </div>
  );
}
