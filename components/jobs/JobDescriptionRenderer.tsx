"use client";

import { useMemo } from "react";
import {
  parseJobDescription,
  StructuredJobDescription,
} from "@/lib/jobs/description-parser";
import { cn } from "@/lib/utils";
import { Briefcase, CheckCircle2, Award, Sparkles, Gift } from "lucide-react";

interface JobDescriptionRendererProps {
  description: string | StructuredJobDescription | null | undefined;
  className?: string;
  compact?: boolean;
}

export function JobDescriptionRenderer({
  description,
  className,
  compact = false,
}: JobDescriptionRendererProps) {
  const structured = useMemo(() => {
    return parseJobDescription(description);
  }, [description]);

  const hasContent =
    Boolean(structured.overview) ||
    structured.responsibilities.length > 0 ||
    structured.requiredQualifications.length > 0 ||
    structured.preferredQualifications.length > 0 ||
    structured.benefits.length > 0;

  if (!hasContent) {
    return (
      <div className={cn("rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400", className)}>
        No detailed job description has been added for this position yet.
      </div>
    );
  }

  return (
    <div className={cn("space-y-8 text-slate-800", className)}>
      {/* 1. Role Overview */}
      {structured.overview && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-slate-500" />
            <span>Role Overview</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {structured.overview}
          </p>
        </section>
      )}

      {/* 2. Key Responsibilities */}
      {structured.responsibilities.length > 0 && (
        <section className="space-y-3.5 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
            <span>Key Responsibilities</span>
          </h3>
          <div className="space-y-3">
            {structured.responsibilities.map((resp, idx) => (
              <div key={idx} className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  {resp.title}
                </h4>
                {resp.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {resp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Required Qualifications */}
      {structured.requiredQualifications.length > 0 && (
        <section className="space-y-3.5 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Award className="h-3.5 w-3.5 text-slate-500" />
            <span>Required Qualifications</span>
          </h3>
          <div className="space-y-3">
            {structured.requiredQualifications.map((req, idx) => (
              <div key={idx} className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  {req.title}
                </h4>
                {req.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {req.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Preferred Qualifications */}
      {structured.preferredQualifications.length > 0 && (
        <section className="space-y-3 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            <span>Preferred Qualifications</span>
          </h3>
          <ul className="space-y-2">
            {structured.preferredQualifications.map((pref, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>{pref}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 5. Benefits & Perks */}
      {structured.benefits.length > 0 && (
        <section className="space-y-3 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Gift className="h-3.5 w-3.5 text-emerald-500" />
            <span>Benefits & Perks</span>
          </h3>
          <ul className="space-y-2">
            {structured.benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
export default JobDescriptionRenderer;
