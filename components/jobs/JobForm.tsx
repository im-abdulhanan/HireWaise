"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  ArrowRight,
  Eye,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RequirementEditor, RequirementItem } from "./RequirementEditor";
import { ScreeningPolicyEditor } from "./ScreeningPolicyEditor";
import { JobDescriptionRenderer } from "./JobDescriptionRenderer";
import { IScreeningPolicy, IScoringWeights } from "@/models/Job";

interface JobFormProps {
  initialData?: {
    id?: string;
    title?: string;
    department?: string;
    location?: string;
    workplaceType?: string;
    employmentType?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    description?: string;
    status?: string;
    applicationDeadline?: string | Date;
    screeningPolicy?: IScreeningPolicy;
    scoringWeights?: IScoringWeights;
    requirements?: RequirementItem[];
  };
  isEditing?: boolean;
}

export function JobForm({ initialData, isEditing = false }: JobFormProps) {
  const router = useRouter();

  // Basic Info
  const [title, setTitle] = useState(initialData?.title || "");
  const [department, setDepartment] = useState(initialData?.department || "");
  const [location, setLocation] = useState(initialData?.location || "Remote");
  const [workplaceType, setWorkplaceType] = useState(initialData?.workplaceType || "REMOTE");
  const [employmentType, setEmploymentType] = useState(initialData?.employmentType || "FULL_TIME");
  const [salaryMin, setSalaryMin] = useState<string>(
    initialData?.salaryMin ? String(initialData.salaryMin) : ""
  );
  const [salaryMax, setSalaryMax] = useState<string>(
    initialData?.salaryMax ? String(initialData.salaryMax) : ""
  );
  const [salaryCurrency, setSalaryCurrency] = useState(initialData?.salaryCurrency || "USD");
  const [description, setDescription] = useState(initialData?.description || "");
  const [status, setStatus] = useState(initialData?.status || "PUBLISHED");
  const [applicationDeadline, setApplicationDeadline] = useState(
    initialData?.applicationDeadline
      ? new Date(initialData.applicationDeadline).toISOString().split("T")[0]
      : ""
  );

  // AI Requirements
  const [requirements, setRequirements] = useState<RequirementItem[]>(
    initialData?.requirements || []
  );

  // Policy & Weights
  const [policy, setPolicy] = useState<IScreeningPolicy>(
    initialData?.screeningPolicy || {
      requiredSkillsMustMatch: true,
      minimumExperienceMustMatch: true,
      educationRequired: false,
      humanReviewBelowScore: 75,
    }
  );

  const [weights, setWeights] = useState<IScoringWeights>(
    initialData?.scoringWeights || {
      requiredSkillsWeight: 40,
      experienceWeight: 25,
      educationWeight: 15,
      preferredSkillsWeight: 10,
      otherWeight: 10,
    }
  );

  // UI state
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPlanLimitReached, setIsPlanLimitReached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [descriptionViewTab, setDescriptionViewTab] = useState<"edit" | "preview">("edit");

  // Generate Job Description from configured requirements with AI
  const handleGenerateWithAI = async () => {
    let activeTitle = title.trim();
    if (!activeTitle) {
      if (requirements.length > 0 && requirements[0].title) {
        activeTitle = `${requirements[0].title} Specialist`;
        setTitle(activeTitle);
      } else {
        activeTitle = "Open Position";
        setTitle(activeTitle);
      }
    }

    setError(null);
    setAiSuccessMessage(null);
    setGeneratingAi(true);

    try {
      const res = await fetch("/api/jobs/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeTitle,
          department: department || "General",
          location: location || "Remote",
          workplaceType,
          employmentType,
          requirements: requirements || [],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate job description with AI.");
      }

      setDescription(json.data.description);
      setDescriptionViewTab("preview");
    } catch (err: any) {
      setError(err.message || "Failed to generate job description. Please try again.");
    } finally {
      setGeneratingAi(false);
    }
  };

  // Trigger Gemini Job Analyzer (extracts requirements from description text)
  const handleAnalyzeWithAI = async () => {
    if (!description || description.trim().length < 20) {
      setError("Please enter a detailed job description before extracting requirements.");
      return;
    }

    setError(null);
    setAiSuccessMessage(null);
    setAnalyzingAi(true);

    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to analyze job description.");
      }

      const extracted = json.data;

      // Map extracted requirementsList to component format
      const mappedList: RequirementItem[] = (extracted.requirementsList || []).map(
        (r: any, idx: number) => ({
          id: `req-ai-${idx}-${Date.now()}`,
          title: r.title,
          category: r.category,
          type: r.type,
          normalizedKey: r.normalizedKey,
          minimumValue: r.minimumValue,
        })
      );

      setRequirements(mappedList);
      setAiSuccessMessage(
        `Successfully extracted ${mappedList.length} structured requirements.`
      );
    } catch (err: any) {
      setError(err.message || "AI Analysis failed. Please try again or add requirements manually.");
    } finally {
      setAnalyzingAi(false);
    }
  };

  // Submit Job
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Job title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Job description is required.");
      return;
    }

    setError(null);
    setIsPlanLimitReached(false);
    setSaving(true);

    const payload = {
      title: title.trim(),
      department: department.trim(),
      location: location.trim(),
      workplaceType,
      employmentType,
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      salaryMax: salaryMax ? Number(salaryMax) : undefined,
      salaryCurrency,
      description,
      status,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline).toISOString() : null,
      screeningPolicy: policy,
      scoringWeights: weights,
      requirements,
    };

    try {
      const url = isEditing && initialData?.id ? `/api/jobs/${initialData.id}` : "/api/jobs";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json.code === "PLAN_LIMIT_REACHED" || res.status === 403) {
          setIsPlanLimitReached(true);
        }
        throw new Error(json.error || "Failed to save job.");
      }

      router.push("/dashboard/jobs");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      {/* Plan Limit Alert Banner */}
      {isPlanLimitReached && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border-2 border-purple-300 bg-purple-50 p-4 text-sm text-purple-950 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-200 text-purple-800">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-purple-950">Monthly Job Limit Reached</p>
              <p className="text-xs text-purple-800 mt-0.5">
                You've reached your monthly job limit. Upgrade to Pro to create up to 50 jobs per month.
              </p>
            </div>
          </div>
          <Link href="/dashboard/billing">
            <Button size="sm" type="button" className="bg-[#19191a] text-white hover:bg-black text-xs font-bold gap-1 shrink-0">
              <span>Upgrade to Pro ($10/mo)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Alert Messages */}
      {error && !isPlanLimitReached && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      )}

      {aiSuccessMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p>{aiSuccessMessage}</p>
        </div>
      )}

      {/* Section 1: Job Metadata */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-base font-semibold text-slate-900 mb-1">Job Details</h3>
        <p className="text-xs text-slate-500 mb-6">
          Basic role metadata displayed to candidates on the public application page.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Job Title <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Senior Full Stack Engineer, AI Product Designer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Department
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="e.g. Engineering, Product, Growth"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="e.g. San Francisco, CA or Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Workplace Type
            </label>
            <select
              value={workplaceType}
              onChange={(e) => setWorkplaceType(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-[#19191a] outline-none"
            >
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ON_SITE">On-site</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Employment Type
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-[#19191a] outline-none"
            >
              <option value="FULL_TIME">Full-time</option>
              <option value="PART_TIME">Part-time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Salary Range (Optional)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  placeholder="Min"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className="pl-8"
                />
              </div>
              <span className="text-xs text-slate-400">to</span>
              <div className="relative flex-1">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  placeholder="Max"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Job Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-[#19191a] outline-none"
            >
              <option value="PUBLISHED">Published (Open for Applications)</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived (Closed)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Job Timeline / Application Deadline (Optional)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="date"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="pl-9"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              After this deadline, the public link will automatically switch to &ldquo;Applications Closed&rdquo;.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Requirements Editor */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <RequirementEditor
          requirements={requirements}
          onChange={setRequirements}
        />
      </div>

      {/* Section 3: Job Description & AI Generator */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Job Description</h3>
            <p className="text-xs text-slate-500">
              Generate a recruiter-ready structured description automatically based on your Section 2 requirements, or write your own.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={generatingAi}
              className="gap-2 bg-[#19191a] hover:bg-[#2b2b2d] text-white shadow-md text-xs font-semibold px-4 py-2"
              title="Generate full description from requirements"
            >
              {generatingAi ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Generating with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Generate Description with AI</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* View Mode Segmented Control */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setDescriptionViewTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                descriptionViewTab === "preview"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Structured Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setDescriptionViewTab("edit")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                descriptionViewTab === "edit"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Text</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Zero Markdown syntax • Automatically formatted for applicants
          </span>
        </div>

        {descriptionViewTab === "edit" ? (
          <div>
            <Textarea
              rows={12}
              placeholder="Click 'Generate Description with AI' to automatically write a professional job description from your configured requirements, or type/paste your custom description here..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="font-mono text-xs leading-relaxed"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
            <JobDescriptionRenderer description={description} />
          </div>
        )}
      </div>

      {/* Section 4: Policy & Scoring Weights */}
      <ScreeningPolicyEditor
        policy={policy}
        weights={weights}
        onPolicyChange={setPolicy}
        onWeightsChange={setWeights}
      />

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/jobs")}
        >
          Cancel
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={saving || !title.trim() || !description.trim()}
            className="gap-2 shadow-sm"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving Job...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{isEditing ? "Update Job" : "Publish Job"}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
