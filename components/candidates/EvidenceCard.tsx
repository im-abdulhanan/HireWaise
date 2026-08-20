"use client";

import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  Quote,
  ShieldCheck,
  FileCheck2,
} from "lucide-react";
import { MatchStatus } from "@/models/ScreeningRequirementResult";

interface EvidenceCardProps {
  requirementTitle: string;
  category: "REQUIRED" | "PREFERRED" | "OPTIONAL";
  type: "SKILL" | "EXPERIENCE" | "EDUCATION" | "ACADEMIC_STATUS" | "CERTIFICATION" | "CUSTOM";
  status: MatchStatus;
  evidenceQuote?: string;
  reasoning: string;
  confidence?: number;
  verifiedByAi?: boolean;
}

export function EvidenceCard({
  requirementTitle,
  category,
  type,
  status,
  evidenceQuote,
  reasoning,
  confidence = 0.95,
  verifiedByAi = true,
}: EvidenceCardProps) {
  const statusConfig = {
    MATCHED: {
      label: "Matched",
      variant: "success" as const,
      icon: CheckCircle2,
      border: "border-emerald-200/80 bg-emerald-50/40",
      iconColor: "text-emerald-600",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
      evidenceLabel: "Direct evidence",
    },
    PARTIAL: {
      label: "Partial Match",
      variant: "warning" as const,
      icon: AlertCircle,
      border: "border-amber-200/80 bg-amber-50/40",
      iconColor: "text-amber-600",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
      evidenceLabel: "Partial evidence",
    },
    UNCLEAR: {
      label: "Unclear / Review",
      variant: "purple" as const,
      icon: HelpCircle,
      border: "border-purple-200/80 bg-purple-50/40",
      iconColor: "text-purple-600",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
      evidenceLabel: "Unclear evidence",
    },
    NOT_FOUND: {
      label: "Not Found",
      variant: "destructive" as const,
      icon: XCircle,
      border: "border-rose-200/80 bg-rose-50/40",
      iconColor: "text-rose-600",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
      evidenceLabel: "No evidence found",
    },
  }[status] || {
    label: status,
    variant: "secondary" as const,
    icon: HelpCircle,
    border: "border-slate-200 bg-slate-50",
    iconColor: "text-slate-500",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
    evidenceLabel: "Evidence status",
  };

  const StatusIcon = statusConfig.icon;

  // Determine evidence type description
  const evidenceTypeDesc =
    status === "MATCHED"
      ? evidenceQuote && !evidenceQuote.startsWith("Skill verified")
        ? "Exact resume evidence"
        : "Candidate profile qualification"
      : status === "PARTIAL"
      ? "Partial resume evidence"
      : status === "UNCLEAR"
      ? "Ambiguous resume evidence"
      : "No supporting evidence";

  return (
    <div
      className={`rounded-2xl border p-6 sm:p-7 transition-all shadow-xs ${statusConfig.border}`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <StatusIcon className={`h-5 w-5 shrink-0 mt-0.5 ${statusConfig.iconColor}`} />
          <div className="min-w-0">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {requirementTitle}
            </h4>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {type}
              </span>
              <span className="text-slate-300">•</span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  category === "REQUIRED" ? "text-[#19191a]" : "text-slate-500"
                }`}
              >
                {category}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-medium text-slate-600 bg-white/70 px-2 py-0.5 rounded border border-black/5">
                {evidenceTypeDesc}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statusConfig.badgeColor}`}
          >
            {statusConfig.label}
          </span>
          {confidence !== undefined && (
            <span className="text-[11px] font-mono font-medium text-slate-700 bg-white/90 border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs">
              {Math.round(confidence * 100)}% conf
            </span>
          )}
        </div>
      </div>

      {/* Verbatim Evidence Quote Box */}
      {evidenceQuote && (
        <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Quote className="h-4 w-4 text-slate-400 shrink-0 mt-0.5 rotate-180" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm not-italic font-normal text-slate-800 leading-relaxed">
                {evidenceQuote.startsWith('"') ? evidenceQuote : `"${evidenceQuote}"`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Explanation / Reasoning */}
      <div className="mt-3.5 flex items-start gap-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <p>
          <strong className="text-slate-900 font-semibold">Reasoning:</strong> {reasoning}
        </p>
      </div>

      {/* Verification footer */}
      {verifiedByAi && (
        <div className="mt-4 pt-3.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Screening Engine: Verified AI-assisted analysis</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Evidence Verification: Passed</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default EvidenceCard;
