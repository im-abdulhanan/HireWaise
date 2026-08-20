"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building,
  MapPin,
  Clock,
  DollarSign,
  ShieldCheck,
  X,
  Lock,
  ArrowRight,
  Briefcase,
  FileQuestion,
  Calendar,
  Check,
  Copy,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const PIPELINE_STAGES = [
  {
    key: "APPLICATION_SUBMITTED",
    title: "Application submitted",
    description: "Your submission has been securely registered.",
  },
  {
    key: "RESUME_UPLOADED",
    title: "Resume uploaded",
    description: "Resume document stored and validated.",
  },
  {
    key: "ANALYZING_RESUME",
    title: "Analyzing your qualifications",
    description: "Reviewing work history, technical skills, and experience.",
  },
  {
    key: "MATCHING_REQUIREMENTS",
    title: "Matching job requirements",
    description: "Evaluating alignment against position criteria.",
  },
  {
    key: "VERIFYING_RESULTS",
    title: "Verifying screening results",
    description: "Confirming verified citations for recruiter review.",
  },
];

type CardStatus = "COMPLETED" | "ACTIVE" | "PENDING" | "FAILED";

function getCardStatus(
  stageKey: string,
  currentStage: string,
  progress: number,
  pipelineStatus: string
): CardStatus {
  if (pipelineStatus === "FAILED") {
    return "FAILED";
  }

  // Normalize legacy or alternative stage identifiers
  const normalize = (s: string) => {
    switch (s) {
      case "QUEUED":
        return "APPLICATION_SUBMITTED";
      case "RECEIVED":
      case "FILE_PROCESSING":
      case "PARSING_RESUME":
        return "RESUME_UPLOADED";
      case "EXTRACTING_PROFILE":
      case "RESUME_ANALYSIS":
        return "ANALYZING_RESUME";
      case "REQUIREMENT_MATCHING":
        return "MATCHING_REQUIREMENTS";
      case "VERIFYING_EVIDENCE":
      case "EVIDENCE_VERIFICATION":
      case "CALCULATING_SCORE":
      case "SAVING_RESULT":
        return "VERIFYING_RESULTS";
      default:
        return s;
    }
  };

  const current = normalize(currentStage);

  if (current === "COMPLETED" || progress >= 100) {
    return "COMPLETED";
  }

  // 1. APPLICATION_SUBMITTED: Always completed once registered
  if (stageKey === "APPLICATION_SUBMITTED") {
    return "COMPLETED";
  }

  // 2. RESUME_UPLOADED: Completed when progress >= 20 or reached RESUME_UPLOADED / later
  if (stageKey === "RESUME_UPLOADED") {
    if (
      progress >= 20 ||
      [
        "RESUME_UPLOADED",
        "ANALYZING_RESUME",
        "MATCHING_REQUIREMENTS",
        "VERIFYING_RESULTS",
        "COMPLETED",
      ].includes(current)
    ) {
      return "COMPLETED";
    }
    return "ACTIVE";
  }

  // 3. ANALYZING_RESUME:
  // - Completed when progress > 40 or current is MATCHING_REQUIREMENTS / later
  // - Active when progress == 20 or 40, or current is RESUME_UPLOADED / ANALYZING_RESUME
  // - Pending when progress < 20
  if (stageKey === "ANALYZING_RESUME") {
    if (
      progress >= 60 ||
      ["MATCHING_REQUIREMENTS", "VERIFYING_RESULTS", "COMPLETED"].includes(current)
    ) {
      return "COMPLETED";
    }
    if (
      progress >= 20 ||
      ["RESUME_UPLOADED", "ANALYZING_RESUME"].includes(current)
    ) {
      return "ACTIVE";
    }
    return "PENDING";
  }

  // 4. MATCHING_REQUIREMENTS:
  // - Completed when progress >= 80 or current is VERIFYING_RESULTS / later
  // - Active when progress == 60 or current is MATCHING_REQUIREMENTS
  // - Pending when progress < 60
  if (stageKey === "MATCHING_REQUIREMENTS") {
    if (
      progress >= 80 ||
      ["VERIFYING_RESULTS", "COMPLETED"].includes(current)
    ) {
      return "COMPLETED";
    }
    if (progress === 60 || current === "MATCHING_REQUIREMENTS") {
      return "ACTIVE";
    }
    return "PENDING";
  }

  // 5. VERIFYING_RESULTS:
  // - Completed when progress >= 100 or current is COMPLETED
  // - Active when progress == 80 or current is VERIFYING_RESULTS
  // - Pending when progress < 80
  if (stageKey === "VERIFYING_RESULTS") {
    if (progress >= 100 || current === "COMPLETED") {
      return "COMPLETED";
    }
    if (progress === 80 || current === "VERIFYING_RESULTS") {
      return "ACTIVE";
    }
    return "PENDING";
  }

  return "PENDING";
}

export default function CandidateApplyPage() {
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Asynchronous Submission & Real Status Polling (strictly driven by backend)
  const [submitting, setSubmitting] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [currentAppId, setCurrentAppId] = useState<string | null>(null);
  const [currentRefNumber, setCurrentRefNumber] = useState<string | null>(null);
  const [screeningStatus, setScreeningStatus] = useState<"PROCESSING" | "COMPLETED" | "FAILED">("PROCESSING");
  const [currentStage, setCurrentStage] = useState<string>("APPLICATION_SUBMITTED");
  const [stageProgress, setStageProgress] = useState<number>(10);
  const [copiedRef, setCopiedRef] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Helper to start real backend status polling
  const startStatusPolling = (appId: string, refNum: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/applications/${appId}/status`);
        if (!statusRes.ok) return;

        const statusData = await statusRes.json();

        if (statusData.currentStage) {
          setCurrentStage(statusData.currentStage);
        }
        if (typeof statusData.progress === "number") {
          setStageProgress(statusData.progress);
        }
        if (statusData.screeningStatus) {
          setScreeningStatus(statusData.screeningStatus);
        }

        // Check for pipeline completion or failure
        if (statusData.completed || statusData.screeningStatus === "COMPLETED") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(`pending_app_${params.jobSlug}`);
          }
          setScreeningStatus("COMPLETED");
          setStageProgress(100);
          setCurrentStage("COMPLETED");
        } else if (statusData.failed || statusData.screeningStatus === "FAILED") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(`pending_app_${params.jobSlug}`);
          }
          setScreeningStatus("FAILED");
          setStageProgress(100);
          setCurrentStage("FAILED");
        }
      } catch {
        // Network hiccup during polling - keep polling on next tick
      }
    }, 1500);
  };

  useEffect(() => {
    async function loadJob() {
      try {
        const res = await fetch(`/api/jobs/public/${params.jobSlug}`);
        const json = await res.json();
        if (res.status === 404 || json.notFound) {
          setIsNotFound(true);
          setError(json.message || "Position not found.");
        } else if (json.success) {
          setJob(json.data);

          // Restore polling if applicant refreshed page during processing
          if (typeof window !== "undefined") {
            try {
              const saved = sessionStorage.getItem(`pending_app_${params.jobSlug}`);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.appId && Date.now() - (parsed.timestamp || 0) < 15 * 60 * 1000) {
                  setCurrentAppId(parsed.appId);
                  setCurrentRefNumber(parsed.refNum);
                  setShowProcessingModal(true);
                  setSubmitting(true);
                  setScreeningStatus("PROCESSING");
                  startStatusPolling(parsed.appId, parsed.refNum);
                }
              }
            } catch {
              // Ignore sessionStorage parse error
            }
          }
        } else {
          setError(json.error || "Failed to load job details.");
        }
      } catch (err) {
        setError("Failed to load job details. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    if (params.jobSlug) {
      loadJob();
    }
  }, [params.jobSlug]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      setSubmitError("Please upload a PDF or DOCX resume document.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("Resume file size exceeds the 10MB limit.");
      return;
    }

    setSubmitError(null);
    setResumeFile(file);
  };

  const handleCopyReference = () => {
    if (currentRefNumber) {
      navigator.clipboard.writeText(currentRefNumber);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  // Submit Application with Real Asynchronous Pipeline & Polling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return; // Prevent duplicate clicks

    if (!name.trim() || !email.trim()) {
      setSubmitError("Please enter your full name and email address.");
      return;
    }

    if (!resumeFile) {
      setSubmitError("Please upload your resume (PDF or DOCX).");
      return;
    }

    if (!consentChecked) {
      setSubmitError("Please accept the privacy and screening consent before submitting.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    setShowProcessingModal(true);
    setScreeningStatus("PROCESSING");
    setCurrentStage("APPLICATION_SUBMITTED");
    setStageProgress(10);

    const formData = new FormData();
    formData.append("jobId", job.id);
    formData.append("name", name.trim());
    formData.append("email", email.trim());
    formData.append("phone", phone.trim());
    formData.append("location", location.trim());
    formData.append("resume", resumeFile);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit application.");
      }

      const appId = json.data?.applicationId;
      const refNum = json.data?.referenceNumber || `APP-${appId?.slice(-8).toUpperCase()}`;

      setCurrentAppId(appId);
      setCurrentRefNumber(refNum);
      if (json.data?.currentStage) setCurrentStage(json.data.currentStage);
      if (typeof json.data?.progress === "number") setStageProgress(json.data.progress);

      // Save to sessionStorage for page refresh resilience
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `pending_app_${params.jobSlug}`,
          JSON.stringify({ appId, refNum, timestamp: Date.now() })
        );
      }

      // Start Real-Time Status Polling
      startStatusPolling(appId, refNum);
    } catch (err: any) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setShowProcessingModal(false);
      setSubmitting(false);
      setSubmitError(err.message || "An unexpected error occurred during submission.");
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#e7e5e2] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#19191a] border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Loading job opening...</p>
        </div>
      </div>
    );
  }

  // 2. 404 Position Not Found State
  if (isNotFound || !job) {
    return (
      <div className="min-h-screen bg-[#e7e5e2] flex flex-col justify-between text-[#19191a] selection:bg-[#19191a] selection:text-white">
        <header className="border-b border-black/10 bg-[#e7e5e2]/80 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#19191a] text-white font-bold text-sm">
                C
              </div>
              <span className="text-sm font-bold text-slate-900">Career Portal</span>
            </div>
            <Badge variant="outline" className="text-xs text-slate-500 font-mono">
              404 • Not Found
            </Badge>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="max-w-md w-full rounded-2xl border border-black/15 bg-white p-8 sm:p-10 text-center shadow-md">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
              <FileQuestion className="h-7 w-7" />
            </div>

            <Badge variant="secondary" className="mb-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Position Unavailable
            </Badge>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">404 — Position Not Found</h1>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              This job posting may have expired, been removed, or the link provided is inaccurate.
            </p>
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2.5">
              <Link href="/">
                <Button className="w-full gap-2 text-xs font-semibold bg-[#19191a] hover:bg-[#2b2b2d] text-white">
                  <span>Return to Homepage</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </main>

        <footer className="py-6 text-center text-xs text-slate-400 border-t border-black/10">
          Powered by AI Recruitment Screening SaaS
        </footer>
      </div>
    );
  }

  const isJobClosed = Boolean(job.isClosed);
  const requiredReqs = (job.requirements || []).filter((r: any) => r.category === "REQUIRED");
  const preferredReqs = (job.requirements || []).filter((r: any) => r.category === "PREFERRED");

  const formattedDeadline = job.applicationDeadline
    ? new Date(job.applicationDeadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#e7e5e2] text-[#19191a] selection:bg-[#19191a] selection:text-white flex flex-col justify-between relative">
      {/* Top Company Brand Navigation */}
      <header className="border-b border-black/10 bg-[#e7e5e2]/90 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#19191a] text-white font-bold shadow-sm">
              {job.company?.name?.charAt(0) || "C"}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">{job.company?.name || "Company"}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Career Opportunities</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isJobClosed ? (
              <>
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold text-amber-700">Applications Closed</span>
              </>
            ) : (
              <>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700">Accepting Applications</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        {/* Closed Timeline Notification Banner */}
        {isJobClosed && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 sm:p-6 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-amber-950">
                  Applications Closed for this Position
                </h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {formattedDeadline
                    ? `The application deadline of ${formattedDeadline} has passed. This opening is no longer accepting new submissions.`
                    : "The hiring team is no longer accepting new applications for this position. Candidate screening is currently underway."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Job Description & Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge variant="outline" className="text-xs font-semibold">
                  {job.workplaceType} • {job.employmentType?.replace("_", " ")}
                </Badge>
                {isJobClosed ? (
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                    Closed
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs bg-emerald-600 text-white">
                    Active
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {job.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
                {job.department && (
                  <span className="flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-slate-400" />
                    {job.department}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {job.location || "Remote"}
                </span>
                {(job.salaryMin || job.salaryMax) && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : ""}
                    {job.salaryMin && job.salaryMax ? " - " : ""}
                    {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : ""} {job.salaryCurrency}
                  </span>
                )}
                {formattedDeadline && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Deadline: {formattedDeadline}
                  </span>
                )}
              </div>
            </div>

            {/* Key Requirements Checklist */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#19191a]" />
                  Role Qualifications
                </h2>

                {requiredReqs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Key Qualifications
                    </p>
                    <ul className="space-y-2">
                      {requiredReqs.map((req: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <CheckCircle2 className="h-4 w-4 text-[#19191a] shrink-0 mt-0.5" />
                          <span>
                            <strong>{req.title}</strong>
                            {req.minimumValue ? ` (${req.minimumValue}+ years required)` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {preferredReqs.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Preferred / Bonus Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {preferredReqs.map((req: any, idx: number) => (
                        <span key={idx} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                          {req.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Full Job Description */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-3">About the Role</h2>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                {job.description}
              </div>
            </div>
          </div>

          {/* Right Column: Application Form OR Closed Notice */}
          <div className="lg:col-span-5">
            {isJobClosed ? (
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-md shadow-slate-200/50 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                  <Lock className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Applications are Closed
                </h3>

                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Thank you for your interest in joining {job.company?.name || "our team"}. The application period for this role has ended.
                </p>

                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left space-y-2 border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Position Status:</span>
                    <span className="font-semibold text-amber-700">Closed</span>
                  </div>
                  {formattedDeadline && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Deadline:</span>
                      <span className="font-medium text-slate-800">{formattedDeadline}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Hiring Company:</span>
                    <span className="font-medium text-slate-800">{job.company?.name || "TechCorp"}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400">
                    Stay tuned for future job openings and opportunities.
                  </p>
                </div>
              </div>
            ) : (
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-md shadow-slate-200/50">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Apply for this position</h3>
                <p className="text-xs text-slate-500 mt-1 mb-6">
                  Submit your contact details and resume. Initial qualification screening is powered by AI decision support.
                </p>

                {submitError && (
                  <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Alex Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="alex@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                      <Input
                        placeholder="+1 (555) 000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                      <Input
                        placeholder="City, Country"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Resume Upload Area */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Resume / CV <span className="text-red-500">*</span>
                    </label>
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => !submitting && fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                        dragActive
                          ? "border-[#19191a] bg-slate-100"
                          : resumeFile
                          ? "border-emerald-500 bg-emerald-50/30"
                          : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
                      } ${submitting ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelected(e.target.files[0]);
                          }
                        }}
                        disabled={submitting}
                        className="hidden"
                      />

                      {resumeFile ? (
                        <div className="flex items-center justify-between text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{resumeFile.name}</p>
                              <p className="text-[10px] text-slate-500">
                                {(resumeFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace
                              </p>
                            </div>
                          </div>
                          {!submitting && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setResumeFile(null);
                              }}
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <UploadCloud className="h-7 w-7 text-slate-400" />
                          <p className="text-xs font-semibold text-slate-700">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-[10px] text-slate-500">
                            PDF or DOCX (Max 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Consent Checkbox */}
                  <div className="flex items-start gap-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      disabled={submitting}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#19191a] focus:ring-[#19191a]"
                      required
                    />
                    <label htmlFor="consent" className="text-[11px] text-slate-500 leading-snug cursor-pointer">
                      I agree to the processing of my personal data and resume for candidate qualification screening via automated AI decision support.
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full gap-2 bg-[#19191a] hover:bg-[#2b2b2d] text-white shadow-md text-xs font-semibold py-2.5 mt-2"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Processing Application...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Application</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-black/10">
        Powered by AI Recruitment Screening SaaS • Deterministic Evaluation & Evidence Audit
      </footer>

      {/* FULL-SCREEN ASYNCHRONOUS APPLICATION PROCESSING MODAL */}
      {showProcessingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md sm:max-w-lg bg-white rounded-3xl border border-black/10 shadow-2xl p-6 sm:p-8 relative overflow-hidden flex flex-col">
            
            {/* Top Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-6">
              <div
                className="bg-[#19191a] h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(stageProgress, 100)}%` }}
              />
            </div>

            {/* PROCESSING STATE */}
            {screeningStatus === "PROCESSING" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#19191a] text-white shadow-sm">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Application Received
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      We&apos;re reviewing your application...
                    </p>
                  </div>
                </div>

                {/* Multi-Stage Pipeline Checklist */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 space-y-4">
                  {PIPELINE_STAGES.map((stage) => {
                    const status = getCardStatus(stage.key, currentStage, stageProgress, screeningStatus);
                    const isCompleted = status === "COMPLETED";
                    const isActive = status === "ACTIVE";
                    const isPending = status === "PENDING";
                    const isFailed = status === "FAILED";

                    return (
                      <div
                        key={stage.key}
                        className={`flex items-start gap-3 transition-opacity duration-300 ${
                          isPending ? "opacity-40" : "opacity-100"
                        }`}
                      >
                        {/* Status Icon Indicator */}
                        <div className="mt-0.5 shrink-0">
                          {isCompleted ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          ) : isActive ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#19191a] text-white">
                              <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            </div>
                          ) : isFailed ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                              <AlertCircle className="h-3 w-3" />
                            </div>
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white">
                              <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Stage Text */}
                        <div className="min-w-0">
                          <p
                            className={`text-xs leading-tight ${
                              isActive
                                ? "font-bold text-[#19191a]"
                                : isCompleted
                                ? "font-semibold text-slate-900"
                                : isFailed
                                ? "font-semibold text-rose-700"
                                : "font-normal text-slate-500"
                            }`}
                          >
                            {stage.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {stage.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Helpful Hint */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Real-time verification</span>
                  </span>
                  <span className="font-mono text-slate-700 font-bold">
                    {stageProgress}%
                  </span>
                </div>
              </div>
            )}

            {/* COMPLETED SUCCESS STATE */}
            {screeningStatus === "COMPLETED" && (
              <div className="text-center space-y-5 animate-in zoom-in-95 duration-200">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Application Submitted
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-sm mx-auto leading-relaxed">
                    Your application has been successfully received and is now under review.
                  </p>
                </div>

                {/* Reference ID Card */}
                {currentRefNumber && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Application Reference ID
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="font-mono font-extrabold text-base sm:text-lg text-slate-900 tracking-wide">
                        {currentRefNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyReference}
                        title="Copy Reference"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
                      >
                        {copiedRef ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Verification Confirmation Points */}
                <div className="text-left space-y-2.5 text-xs text-slate-600 bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-start gap-2.5">
                    <FileCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Qualifications audited against role requirements</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Evidence summary prepared for hiring team human review</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    onClick={() => {
                      setShowProcessingModal(false);
                      setSubmitting(false);
                      router.push(`/apply/${params.jobSlug}/success?ref=${encodeURIComponent(currentRefNumber || "")}&name=${encodeURIComponent(name)}`);
                    }}
                    className="w-full bg-[#19191a] hover:bg-[#2b2b2d] text-white text-xs font-semibold py-2.5"
                  >
                    <span>View Confirmation Details</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* FAILED / FALLBACK STATE */}
            {screeningStatus === "FAILED" && (
              <div className="text-center space-y-5 animate-in zoom-in-95 duration-200">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-xs">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    Application Received
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-sm mx-auto leading-relaxed">
                    We couldn&apos;t complete the automated screening. Your application was received successfully. The hiring team can still review it.
                  </p>
                </div>

                {currentRefNumber && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Application Reference ID
                    </p>
                    <p className="font-mono font-bold text-base text-slate-900 mt-1">
                      {currentRefNumber}
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    onClick={() => {
                      setShowProcessingModal(false);
                      setSubmitting(false);
                    }}
                    variant="outline"
                    className="w-full text-xs font-semibold py-2.5"
                  >
                    Close & Return to Job Listing
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
