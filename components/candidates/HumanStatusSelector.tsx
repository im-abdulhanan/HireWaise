"use client";

import { useState } from "react";
import { Check, ChevronDown, UserCheck } from "lucide-react";
import { RecruiterDecisionStatus } from "@/models/Application";

interface HumanStatusSelectorProps {
  applicationId: string;
  currentStatus: RecruiterDecisionStatus;
  onStatusChange?: (newStatus: RecruiterDecisionStatus) => void;
}

const STATUS_CONFIG: Record<
  RecruiterDecisionStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  NEW: {
    label: "New",
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-300",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-300",
  },
  INTERVIEWING: {
    label: "Interviewing",
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
  },
  REJECTED: {
    label: "Rejected",
    bg: "bg-rose-100",
    text: "text-rose-800",
    border: "border-rose-300",
  },
  HIRED: {
    label: "Hired",
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-300",
  },
};

export function HumanStatusSelector({
  applicationId,
  currentStatus,
  onStatusChange,
}: HumanStatusSelectorProps) {
  const [status, setStatus] = useState<RecruiterDecisionStatus>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = async (newStatus: RecruiterDecisionStatus) => {
    if (newStatus === status) {
      setIsOpen(false);
      return;
    }

    const previousStatus = status;
    setStatus(newStatus);
    setIsOpen(false);
    setLoading(true);

    try {
      const res = await fetch(`/api/candidates/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update status.");
      }

      onStatusChange?.(newStatus);
    } catch (err) {
      console.error("Status update error:", err);
      setStatus(previousStatus); // rollback
    } finally {
      setLoading(false);
    }
  };

  const currentCfg = STATUS_CONFIG[status] || STATUS_CONFIG.NEW;

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
          Recruiter Decision:
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-xs transition-all ${currentCfg.bg} ${currentCfg.text} ${currentCfg.border} hover:opacity-90`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>{currentCfg.label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Set Pipeline Status
            </div>
            {(Object.keys(STATUS_CONFIG) as RecruiterDecisionStatus[]).map(
              (statusKey) => {
                const cfg = STATUS_CONFIG[statusKey];
                const isSelected = status === statusKey;

                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => handleSelect(statusKey)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${cfg.bg} border ${cfg.border}`}
                      />
                      {cfg.label}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                  </button>
                );
              }
            )}
          </div>
        </>
      )}
    </div>
  );
}
