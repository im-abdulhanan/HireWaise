"use client";

import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, FileCheck, ArrowRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ApplicationSuccessPage() {
  const searchParams = useSearchParams();
  const params = useParams();

  const referenceNumber = searchParams.get("ref") || "APP-SCREEN-OK";
  const candidateName = searchParams.get("name") || "Applicant";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xl shadow-slate-200/50 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-6 shadow-xs">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Application Submitted!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Thank you, <strong className="text-slate-800">{candidateName}</strong>. Your resume and application have been received and processed.
          </p>

          {/* Reference Card */}
          <div className="my-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Application Reference Number
            </p>
            <p className="text-base font-mono font-bold text-slate-900 mt-1">
              {referenceNumber}
            </p>
          </div>

          {/* What happens next section */}
          <div className="text-left space-y-3 pt-2 pb-6 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              What Happens Next:
            </h4>
            <div className="flex items-start gap-2.5 text-xs text-slate-600">
              <FileCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Our automated engine analyzed your experience against stated qualifications to prepare an objective evidence summary.
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                The recruiting team will review your application. All final interview and hiring decisions remain 100% human.
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={`/apply/${params.jobSlug}`} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Back to Job Post
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
