"use client";

import { IScreeningPolicy, IScoringWeights } from "@/models/Job";
import { Sliders, ShieldAlert, Check, AlertCircle } from "lucide-react";

interface ScreeningPolicyEditorProps {
  policy: IScreeningPolicy;
  weights: IScoringWeights;
  onPolicyChange: (policy: IScreeningPolicy) => void;
  onWeightsChange: (weights: IScoringWeights) => void;
}

export function ScreeningPolicyEditor({
  policy,
  weights,
  onPolicyChange,
  onWeightsChange,
}: ScreeningPolicyEditorProps) {
  const totalWeight =
    (weights.requiredSkillsWeight || 0) +
    (weights.experienceWeight || 0) +
    (weights.educationWeight || 0) +
    (weights.preferredSkillsWeight || 0) +
    (weights.otherWeight || 0);

  const isTotal100 = totalWeight === 100;

  const handleWeightChange = (field: keyof IScoringWeights, value: number) => {
    onWeightsChange({
      ...weights,
      [field]: Math.max(0, Math.min(100, Number(value) || 0)),
    });
  };

  const handleToggle = (field: keyof IScreeningPolicy) => {
    onPolicyChange({
      ...policy,
      [field]: !policy[field],
    });
  };

  return (
    <div className="space-y-8">
      {/* Policy Rules Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-1">
          <ShieldAlert className="h-5 w-5 text-[#19191a]" />
          <h4 className="text-sm font-semibold text-slate-900">Deterministic Screening Rules</h4>
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Enforce strict automated constraints before score calculation.
        </p>

        <div className="space-y-4">
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={policy.requiredSkillsMustMatch}
              onChange={() => handleToggle("requiredSkillsMustMatch")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#19191a] focus:ring-[#19191a]"
            />
            <div>
              <p className="text-sm font-medium text-slate-800">
                Required skills must strictly match
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically disqualifies candidates missing more than 50% of required must-have skills.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={policy.minimumExperienceMustMatch}
              onChange={() => handleToggle("minimumExperienceMustMatch")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#19191a] focus:ring-[#19191a]"
            />
            <div>
              <p className="text-sm font-medium text-slate-800">
                Minimum experience must be satisfied
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Flags candidates with severe experience shortfalls (&lt; 70% of required years) as does not meet.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={policy.educationRequired}
              onChange={() => handleToggle("educationRequired")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#19191a] focus:ring-[#19191a]"
            />
            <div>
              <p className="text-sm font-medium text-slate-800">
                Qualifying degree strictly required
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Requires candidate to hold an exact or higher degree level.
              </p>
            </div>
          </label>
        </div>

        {/* Human Review Threshold */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Human Review Score Threshold
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Candidates scoring below this value are automatically flagged for manual recruiter review.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="50"
                max="90"
                value={policy.humanReviewBelowScore || 75}
                onChange={(e) =>
                  onPolicyChange({
                    ...policy,
                    humanReviewBelowScore: Number(e.target.value),
                  })
                }
                className="w-32 accent-[#19191a] cursor-pointer"
              />
              <span className="flex h-9 w-14 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-900">
                {policy.humanReviewBelowScore || 75}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Configurable Scoring Weights */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-[#19191a]" />
            <h4 className="text-sm font-semibold text-slate-900">Scoring Weight Distribution</h4>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isTotal100
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {isTotal100 ? (
              <>
                <Check className="h-3.5 w-3.5" /> Total: 100%
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5" /> Total: {totalWeight}% (Aim for 100%)
              </>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Configure how different qualification dimensions contribute to the final overall score.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">Required Skills</span>
              <span className="text-xs font-bold text-[#19191a]">{weights.requiredSkillsWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={weights.requiredSkillsWeight}
              onChange={(e) => handleWeightChange("requiredSkillsWeight", Number(e.target.value))}
              className="w-full accent-[#19191a] cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">Experience Years</span>
              <span className="text-xs font-bold text-[#19191a]">{weights.experienceWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={weights.experienceWeight}
              onChange={(e) => handleWeightChange("experienceWeight", Number(e.target.value))}
              className="w-full accent-[#19191a] cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">Education Credentials</span>
              <span className="text-xs font-bold text-[#19191a]">{weights.educationWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={weights.educationWeight}
              onChange={(e) => handleWeightChange("educationWeight", Number(e.target.value))}
              className="w-full accent-[#19191a] cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">Preferred / Bonus Skills</span>
              <span className="text-xs font-bold text-[#19191a]">{weights.preferredSkillsWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={weights.preferredSkillsWeight}
              onChange={(e) => handleWeightChange("preferredSkillsWeight", Number(e.target.value))}
              className="w-full accent-[#19191a] cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">Certifications & Custom Criteria</span>
              <span className="text-xs font-bold text-[#19191a]">{weights.otherWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={weights.otherWeight}
              onChange={(e) => handleWeightChange("otherWeight", Number(e.target.value))}
              className="w-full accent-[#19191a] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
