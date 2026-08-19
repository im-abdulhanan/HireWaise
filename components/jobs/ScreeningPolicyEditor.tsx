"use client";

import { useState, useMemo } from "react";
import { IScreeningPolicy, IScoringWeights } from "@/models/Job";
import {
  ShieldCheck,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Flame,
  Award,
  Layers,
  Info,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ScreeningPolicyEditorProps {
  policy: IScreeningPolicy;
  weights: IScoringWeights;
  onPolicyChange: (policy: IScreeningPolicy) => void;
  onWeightsChange: (weights: IScoringWeights) => void;
}

export type PresetType = "RECOMMENDED" | "SKILLS_FOCUSED" | "EXPERIENCE_FOCUSED" | "CUSTOM";

export const PRESETS: Record<
  "RECOMMENDED" | "SKILLS_FOCUSED" | "EXPERIENCE_FOCUSED",
  IScoringWeights
> = {
  RECOMMENDED: {
    requiredSkillsWeight: 40,
    experienceWeight: 25,
    educationWeight: 15,
    preferredSkillsWeight: 10,
    otherWeight: 10,
  },
  SKILLS_FOCUSED: {
    requiredSkillsWeight: 55,
    experienceWeight: 20,
    educationWeight: 10,
    preferredSkillsWeight: 10,
    otherWeight: 5,
  },
  EXPERIENCE_FOCUSED: {
    requiredSkillsWeight: 25,
    experienceWeight: 50,
    educationWeight: 10,
    preferredSkillsWeight: 10,
    otherWeight: 5,
  },
};

const THRESHOLD_PRESETS = [50, 60, 70, 80, 90];

export function ScreeningPolicyEditor({
  policy,
  weights,
  onPolicyChange,
  onWeightsChange,
}: ScreeningPolicyEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Initialize selected preset based on current weights
  const [selectedPreset, setSelectedPreset] = useState<PresetType>(() => {
    if (
      weights.requiredSkillsWeight === PRESETS.RECOMMENDED.requiredSkillsWeight &&
      weights.experienceWeight === PRESETS.RECOMMENDED.experienceWeight &&
      weights.educationWeight === PRESETS.RECOMMENDED.educationWeight &&
      weights.preferredSkillsWeight === PRESETS.RECOMMENDED.preferredSkillsWeight &&
      weights.otherWeight === PRESETS.RECOMMENDED.otherWeight
    ) {
      return "RECOMMENDED";
    }

    if (
      weights.requiredSkillsWeight === PRESETS.SKILLS_FOCUSED.requiredSkillsWeight &&
      weights.experienceWeight === PRESETS.SKILLS_FOCUSED.experienceWeight &&
      weights.educationWeight === PRESETS.SKILLS_FOCUSED.educationWeight &&
      weights.preferredSkillsWeight === PRESETS.SKILLS_FOCUSED.preferredSkillsWeight &&
      weights.otherWeight === PRESETS.SKILLS_FOCUSED.otherWeight
    ) {
      return "SKILLS_FOCUSED";
    }

    if (
      weights.requiredSkillsWeight === PRESETS.EXPERIENCE_FOCUSED.requiredSkillsWeight &&
      weights.experienceWeight === PRESETS.EXPERIENCE_FOCUSED.experienceWeight &&
      weights.educationWeight === PRESETS.EXPERIENCE_FOCUSED.educationWeight &&
      weights.preferredSkillsWeight === PRESETS.EXPERIENCE_FOCUSED.preferredSkillsWeight &&
      weights.otherWeight === PRESETS.EXPERIENCE_FOCUSED.otherWeight
    ) {
      return "EXPERIENCE_FOCUSED";
    }

    return "CUSTOM";
  });

  const totalWeight =
    (weights.requiredSkillsWeight || 0) +
    (weights.experienceWeight || 0) +
    (weights.educationWeight || 0) +
    (weights.preferredSkillsWeight || 0) +
    (weights.otherWeight || 0);

  const isTotal100 = totalWeight === 100;

  const handleSelectPreset = (presetKey: PresetType) => {
    setSelectedPreset(presetKey);
    if (presetKey !== "CUSTOM") {
      onWeightsChange(PRESETS[presetKey]);
    }
  };

  const handleWeightChange = (field: keyof IScoringWeights, value: number) => {
    setSelectedPreset("CUSTOM");
    onWeightsChange({
      ...weights,
      [field]: Math.max(0, Math.min(100, Number(value) || 0)),
    });
  };

  const handleNormalizeWeights = () => {
    setSelectedPreset("CUSTOM");
    if (totalWeight === 0) {
      onWeightsChange(PRESETS.RECOMMENDED);
      return;
    }
    const factor = 100 / totalWeight;
    const req = Math.round(weights.requiredSkillsWeight * factor);
    const exp = Math.round(weights.experienceWeight * factor);
    const edu = Math.round(weights.educationWeight * factor);
    const pref = Math.round(weights.preferredSkillsWeight * factor);
    const other = Math.max(0, 100 - (req + exp + edu + pref));

    onWeightsChange({
      requiredSkillsWeight: req,
      experienceWeight: exp,
      educationWeight: edu,
      preferredSkillsWeight: pref,
      otherWeight: other,
    });
  };

  const handleToggle = (field: keyof IScreeningPolicy) => {
    onPolicyChange({
      ...policy,
      [field]: !policy[field],
    });
  };

  const handleThresholdChange = (threshold: number) => {
    onPolicyChange({
      ...policy,
      humanReviewBelowScore: threshold,
    });
  };

  // Example Candidate Live Preview calculations
  const exampleCandidateScores = {
    requiredSkills: 95,
    experience: 80,
    education: 100,
    preferredSkills: 70,
    other: 85,
  };

  const calculatedOverallMatch = useMemo(() => {
    const divisor = totalWeight || 100;
    const weightedSum =
      exampleCandidateScores.requiredSkills * (weights.requiredSkillsWeight || 0) +
      exampleCandidateScores.experience * (weights.experienceWeight || 0) +
      exampleCandidateScores.education * (weights.educationWeight || 0) +
      exampleCandidateScores.preferredSkills * (weights.preferredSkillsWeight || 0) +
      exampleCandidateScores.other * (weights.otherWeight || 0);

    return Math.round(weightedSum / divisor);
  }, [weights, totalWeight]);

  const previewThreshold = policy.humanReviewBelowScore || 70;
  const isFlaggedForReview = calculatedOverallMatch < previewThreshold;

  const candidateCategory = useMemo(() => {
    if (calculatedOverallMatch >= 85) return "STRONG MATCH";
    if (calculatedOverallMatch >= 70) return "GOOD MATCH";
    if (calculatedOverallMatch >= 55) return "POTENTIAL MATCH";
    return "DOES NOT MEET";
  }, [calculatedOverallMatch]);

  return (
    <div className="space-y-8">
      {/* 1. Friendly Explanation Callout */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#19191a] text-white">
          <Info className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-slate-900">
            How Screening Settings Work
          </p>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Don&apos;t worry about scoring math — your Required and Preferred requirements are already used by the screening engine. These settings only control how candidates are ranked and when we recommend human review.
          </p>
        </div>
      </div>

      {/* 2. Minimum Requirements (Hard Disqualification Constraints) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#19191a]" />
            <h3 className="text-base font-bold text-slate-900">Minimum Requirements</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Hard requirements determine whether a candidate meets the minimum criteria before detailed evaluation.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={policy.requiredSkillsMustMatch}
              onChange={() => handleToggle("requiredSkillsMustMatch")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#19191a] focus:ring-[#19191a]"
            />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900">
                Required skills must strictly match
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically flags candidates missing more than 50% of required must-have skills.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={policy.minimumExperienceMustMatch}
              onChange={() => handleToggle("minimumExperienceMustMatch")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#19191a] focus:ring-[#19191a]"
            />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900">
                Minimum experience must be satisfied
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Flags candidates with severe experience shortfalls (&lt; 70% of required years).
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={policy.educationRequired}
              onChange={() => handleToggle("educationRequired")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#19191a] focus:ring-[#19191a]"
            />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900">
                Qualifying degree strictly required
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Requires candidate to hold an exact or higher degree level specified in requirements.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* 3. Candidate Evaluation Presets & Weights */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-[#19191a]" />
            <h3 className="text-base font-bold text-slate-900">How candidates are evaluated</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Scoring ranks and compares candidates based on their overall qualification strength.
          </p>
        </div>

        {/* Preset Cards Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-3">
            Choose evaluation focus:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Option A: Recommended */}
            <div
              onClick={() => handleSelectPreset("RECOMMENDED")}
              className={`cursor-pointer rounded-2xl border p-4 transition-all relative ${
                selectedPreset === "RECOMMENDED"
                  ? "border-[#19191a] bg-slate-50 shadow-sm ring-1 ring-[#19191a]"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <Badge variant="default" className="text-[10px] bg-[#19191a] text-white">
                  Popular
                </Badge>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">Recommended</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Balanced evaluation recommended for most jobs.
              </p>
            </div>

            {/* Option B: Skills-focused */}
            <div
              onClick={() => handleSelectPreset("SKILLS_FOCUSED")}
              className={`cursor-pointer rounded-2xl border p-4 transition-all relative ${
                selectedPreset === "SKILLS_FOCUSED"
                  ? "border-[#19191a] bg-slate-50 shadow-sm ring-1 ring-[#19191a]"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                  <Flame className="h-4 w-4" />
                </div>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">Skills-focused</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Prioritize required and preferred technical skills.
              </p>
            </div>

            {/* Option C: Experience-focused */}
            <div
              onClick={() => handleSelectPreset("EXPERIENCE_FOCUSED")}
              className={`cursor-pointer rounded-2xl border p-4 transition-all relative ${
                selectedPreset === "EXPERIENCE_FOCUSED"
                  ? "border-[#19191a] bg-slate-50 shadow-sm ring-1 ring-[#19191a]"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800">
                  <Award className="h-4 w-4" />
                </div>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">Experience-focused</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Prioritize relevant professional experience.
              </p>
            </div>

            {/* Option D: Custom */}
            <div
              onClick={() => handleSelectPreset("CUSTOM")}
              className={`cursor-pointer rounded-2xl border p-4 transition-all relative ${
                selectedPreset === "CUSTOM"
                  ? "border-[#19191a] bg-slate-50 shadow-sm ring-1 ring-[#19191a]"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
                  <Sliders className="h-4 w-4" />
                </div>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">Custom</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Configure scoring weights manually.
              </p>
            </div>
          </div>
        </div>

        {/* Custom Sliders Section (Revealed when Custom is clicked) */}
        {selectedPreset === "CUSTOM" && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Manual Weight Allocation
              </span>

              <div className="flex items-center gap-2">
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
                      <AlertCircle className="h-3.5 w-3.5" /> Total: {totalWeight}% (Must equal 100%)
                    </>
                  )}
                </div>

                {!isTotal100 && (
                  <button
                    type="button"
                    onClick={handleNormalizeWeights}
                    className="text-xs font-semibold text-[#19191a] underline hover:text-black"
                  >
                    Auto-balance
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800">Required Skills</span>
                  <span className="text-xs font-bold text-[#19191a]">
                    {weights.requiredSkillsWeight}%
                  </span>
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

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800">Experience</span>
                  <span className="text-xs font-bold text-[#19191a]">
                    {weights.experienceWeight}%
                  </span>
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

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800">Education</span>
                  <span className="text-xs font-bold text-[#19191a]">
                    {weights.educationWeight}%
                  </span>
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

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800">Preferred Skills</span>
                  <span className="text-xs font-bold text-[#19191a]">
                    {weights.preferredSkillsWeight}%
                  </span>
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

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white sm:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800">Certifications & Other</span>
                  <span className="text-xs font-bold text-[#19191a]">
                    {weights.otherWeight}%
                  </span>
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
        )}
      </div>

      {/* 4. Human Review Threshold */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            When should we ask you to review a candidate?
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Candidates below this score will be flagged for manual review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {THRESHOLD_PRESETS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleThresholdChange(t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                policy.humanReviewBelowScore === t
                  ? "bg-[#19191a] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t}% {t === 70 ? "(Recommended)" : ""}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 pt-2">
          <input
            type="range"
            min="40"
            max="95"
            step="5"
            value={policy.humanReviewBelowScore || 70}
            onChange={(e) => handleThresholdChange(Number(e.target.value))}
            className="w-full max-w-xs accent-[#19191a] cursor-pointer"
          />
          <span className="flex h-8 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900">
            {policy.humanReviewBelowScore || 70}%
          </span>
        </div>
      </div>

      {/* 5. Live Screening Preview Card */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#19191a] text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Live Screening Preview</h4>
              <p className="text-[11px] text-slate-500">Example Candidate Evaluation</p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={`text-xs font-bold ${
              candidateCategory === "STRONG MATCH"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {candidateCategory}
          </Badge>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Overall Match Score:</span>
            <span className="text-base font-extrabold text-[#19191a] font-mono">
              {calculatedOverallMatch}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-400 block">Required Skills</span>
              <span className="font-semibold text-slate-800">
                {exampleCandidateScores.requiredSkills}%{" "}
                <span className="text-slate-400 font-normal">({weights.requiredSkillsWeight}%)</span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Experience</span>
              <span className="font-semibold text-slate-800">
                {exampleCandidateScores.experience}%{" "}
                <span className="text-slate-400 font-normal">({weights.experienceWeight}%)</span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Education</span>
              <span className="font-semibold text-slate-800">
                {exampleCandidateScores.education}%{" "}
                <span className="text-slate-400 font-normal">({weights.educationWeight}%)</span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Preferred Skills</span>
              <span className="font-semibold text-slate-800">
                {exampleCandidateScores.preferredSkills}%{" "}
                <span className="text-slate-400 font-normal">({weights.preferredSkillsWeight}%)</span>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Recruiter Pipeline Action:</span>
            {isFlaggedForReview ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Flagged for Human Review (&lt; {previewThreshold}%)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Automated Shortlist (≥ {previewThreshold}%)</span>
              </span>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-snug">
          This is an example of how your screening settings influence candidate evaluation.
        </p>
      </div>

      {/* 6. Advanced Scoring Collapsible Section */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Advanced Scoring Architecture
            </span>
          </div>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {showAdvanced && (
          <div className="p-5 pt-0 border-t border-slate-100 text-xs text-slate-600 space-y-3">
            <p>
              ScreenAI utilizes a deterministic multi-stage mathematical evaluation engine. Individual requirement matches are calculated against candidate extracted tokens and verified against verbatim resume excerpts.
            </p>
            <div className="bg-slate-50 p-3 rounded-lg font-mono text-[11px] text-slate-700">
              Overall Score = (SkillMatch × W_skills + ExpMatch × W_exp + EduMatch × W_edu + PrefMatch × W_pref + OtherMatch × W_other) / TotalWeight
            </div>
            <p className="text-[11px] text-slate-400">
              All final candidate evaluations generate immutable snapshots with complete audit evidence for human recruiter verification.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScreeningPolicyEditor;
