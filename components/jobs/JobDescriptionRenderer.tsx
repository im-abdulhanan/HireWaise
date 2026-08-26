"use client";

import { useMemo } from "react";
import {
  parseJobDescription,
  StructuredJobDescription,
} from "@/lib/jobs/description-parser";
import { cn } from "@/lib/utils";

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
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Role Overview
          </h3>
          <p className="text-sm text-slate-600 font-normal leading-relaxed whitespace-pre-wrap">
            {structured.overview}
          </p>
        </section>
      )}

      {/* 2. Key Responsibilities */}
      {structured.responsibilities.length > 0 && (
        <section className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Key Responsibilities
          </h3>
          <div className="space-y-4">
            {structured.responsibilities.map((resp, idx) => (
              <div key={idx} className="space-y-0.5">
                <strong className="block text-sm font-bold text-slate-900">
                  {resp.title}
                </strong>
                {resp.description && (
                  <p className="text-sm text-slate-600 font-normal leading-relaxed">
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
        <section className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Required Qualifications
          </h3>
          <div className="space-y-4">
            {structured.requiredQualifications.map((req, idx) => (
              <div key={idx} className="space-y-0.5">
                <strong className="block text-sm font-bold text-slate-900">
                  {req.label || req.title}
                </strong>
                {req.description && (
                  <p className="text-sm text-slate-600 font-normal leading-relaxed">
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
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Preferred Qualifications
          </h3>
          <ul className="space-y-1.5 list-disc pl-5 text-sm text-slate-600 font-normal leading-relaxed">
            {structured.preferredQualifications.map((pref, idx) => (
              <li key={idx}>{pref}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 5. Benefits & Perks */}
      {structured.benefits.length > 0 && (
        <section className="space-y-3 pt-2 border-t border-slate-100">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Benefits & Perks
          </h3>
          <ul className="space-y-1.5 list-disc pl-5 text-sm text-slate-600 font-normal leading-relaxed">
            {structured.benefits.map((benefit, idx) => (
              <li key={idx}>{benefit}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default JobDescriptionRenderer;
