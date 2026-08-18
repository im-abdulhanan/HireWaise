"use client";

import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  Quote,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MatchStatus } from "@/models/ScreeningRequirementResult";

interface EvidenceCardProps {
  requirementTitle: string;
  category: "REQUIRED" | "PREFERRED" | "OPTIONAL";
  type: "SKILL" | "EXPERIENCE" | "EDUCATION" | "CERTIFICATION" | "CUSTOM";
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
  confidence = 0.9,
  verifiedByAi = true,
}: EvidenceCardProps) {
  const isMatched = status === "MATCHED";
  const isPartial = status === "PARTIAL";
  const isNotFound = status === "NOT_FOUND";
  const isUnclear = status === "UNCLEAR";

  const statusConfig = {
    MATCHED: {
      label: "Matched",
      variant: "success" as const,
      icon: CheckCircle2,
      border: "border-emerald-200 bg-emerald-50/30",
      iconColor: "text-emerald-600",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    },
    PARTIAL: {
      label: "Partial Match",
      variant: "warning" as const,
      icon: AlertCircle,
      border: "border-amber-200 bg-amber-50/30",
      iconColor: "text-amber-600",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    },
    UNCLEAR: {
      label: "Unclear / Review",
      variant: "purple" as const,
      icon: HelpCircle,
      border: "border-purple-200 bg-purple-50/30",
      iconColor: "text-purple-600",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    },
    NOT_FOUND: {
      label: "Not Found",
      variant: "destructive" as const,
      icon: XCircle,
      border: "border-rose-200 bg-rose-50/30",
      iconColor: "text-rose-600",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
    },
  }[status] || {
    label: status,
    variant: "secondary" as const,
    icon: HelpCircle,
    border: "border-slate-200 bg-slate-50",
    iconColor: "text-slate-500",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`rounded-xl border p-4.5 transition-all shadow-xs ${statusConfig.border}`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <StatusIcon className={`h-5 w-5 shrink-0 ${statusConfig.iconColor}`} />
          <div>
            <h4 className="text-sm font-semibold text-slate-900 leading-snug">
              {requirementTitle}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {type}
              </span>
              <span className="text-slate-300">•</span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  category === "REQUIRED"
                    ? "text-[#19191a] font-bold"
                    : "text-slate-500"
                }`}
              >
                {category}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusConfig.badgeColor}`}
          >
            {statusConfig.label}
          </span>
          {confidence && (
            <span className="text-[11px] font-mono text-slate-500 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-md">
              {Math.round(confidence * 100)}% conf
            </span>
          )}
        </div>
      </div>

      {/* Verbatim Evidence Quote Box */}
      {evidenceQuote && (
        <div className="mt-3.5 rounded-lg border border-slate-200/80 bg-white p-3 shadow-xs">
          <div className="flex items-start gap-2">
            <Quote className="h-4 w-4 text-[#19191a] shrink-0 mt-0.5 rotate-180" />
            <p className="text-xs italic text-slate-700 leading-relaxed font-serif">
              "{evidenceQuote}"
            </p>
          </div>
        </div>
      )}

      {/* AI Explanation / Reasoning */}
      <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
        <p className="leading-relaxed">
          <strong className="text-slate-800">Reasoning:</strong> {reasoning}
        </p>
      </div>

      {/* Verification footer */}
      {verifiedByAi && (
        <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Audited against resume text</span>
          </span>
        </div>
      )}
    </div>
  );
}
