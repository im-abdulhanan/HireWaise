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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function CandidateApplyPage() {
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Submission & Multi-stage loading
  const [submitting, setSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJob() {
      try {
        const res = await fetch(`/api/jobs/public/${params.jobSlug}`);
        const json = await res.json();
        if (json.success) {
          setJob(json.data);
        } else {
          setError(json.error || "Job opening not found.");
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

  // Submit Application
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    setSubmissionStep(1);

    // Staged progress timers for smooth UX
    const stepTimer1 = setTimeout(() => setSubmissionStep(2), 1200);
    const stepTimer2 = setTimeout(() => setSubmissionStep(3), 2800);
    const stepTimer3 = setTimeout(() => setSubmissionStep(4), 4500);
    const stepTimer4 = setTimeout(() => setSubmissionStep(5), 6500);

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

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit application.");
      }

      setSubmissionStep(6);
      setTimeout(() => {
        const ref = json.data?.referenceNumber || "APP-SUCCESS";
        router.push(`/apply/${params.jobSlug}/success?ref=${encodeURIComponent(ref)}&name=${encodeURIComponent(name)}`);
      }, 1000);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);
      setSubmitError(err.message || "An unexpected error occurred during submission.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading job application...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <Briefcase className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Job Not Found</h2>
          <p className="text-xs text-slate-500 mt-1.5">{error || "This position is currently not accepting applications."}</p>
        </div>
      </div>
    );
  }

  const requiredReqs = (job.requirements || []).filter((r: any) => r.category === "REQUIRED");
  const preferredReqs = (job.requirements || []).filter((r: any) => r.category === "PREFERRED");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Top Company Brand Navigation */}
      <header className="border-b border-slate-200 bg-white/90 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20">
              {job.company?.name?.charAt(0) || "C"}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">{job.company?.name || "Company"}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Career Opportunities</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">Accepting Applications</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Job Description & Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <Badge variant="outline" className="text-xs font-semibold mb-3">
                {job.workplaceType} • {job.employmentType?.replace("_", " ")}
              </Badge>

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
              </div>
            </div>

            {/* Key Requirements Checklist */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
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
                          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
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

          {/* Right Column: Application Form */}
          <div className="lg:col-span-5">
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
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <Input
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Current City
                    </label>
                    <Input
                      placeholder="e.g. San Francisco, CA"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                {/* Resume Upload Drag & Drop Zone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload Resume <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                  />

                  {!resumeFile ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                        dragActive
                          ? "border-blue-600 bg-blue-50/50"
                          : "border-slate-300 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-400"
                      }`}
                    >
                      <UploadCloud className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                      <p className="text-xs font-semibold text-slate-800">
                        Click to upload or drag & drop
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        PDF or DOCX (Max 10MB)
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-6 w-6 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {resumeFile.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(resumeFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setResumeFile(null)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Responsible AI & Privacy Consent */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[11px] leading-relaxed text-slate-600">
                      I agree that my resume will be analyzed for employment qualification screening. I understand AI screening outputs assist recruiters and do not replace human hiring decisions.
                    </span>
                  </label>
                </div>

                {/* Submit CTA */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={submitting || !name.trim() || !email.trim() || !resumeFile}
                    className="w-full gap-2 shadow-md shadow-blue-500/20 py-2.5 text-sm"
                  >
                    <span>Submit Application</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-2">
                  <Lock className="h-3 w-3" />
                  <span>Secure SSL submission • Tenant PII isolated</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Multi-step Loading Progress Modal */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 shadow-inner">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Processing Your Application</h3>
              <p className="text-xs text-slate-500 mt-1">
                Our autonomous engine is parsing and matching your resume.
              </p>
            </div>

            {/* Step list */}
            <div className="space-y-3">
              {[
                { step: 1, label: "Uploading resume document..." },
                { step: 2, label: "Extracting resume text..." },
                { step: 3, label: "Analyzing skills & experience..." },
                { step: 4, label: "Evaluating qualification requirements..." },
                { step: 5, label: "Verifying evidence quotes..." },
                { step: 6, label: "Screening complete! Redirecting..." },
              ].map((item) => {
                const isCompleted = submissionStep > item.step;
                const isCurrent = submissionStep === item.step;

                return (
                  <div key={item.step} className="flex items-center gap-3 text-xs">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : isCurrent ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span
                      className={`font-medium ${
                        isCompleted
                          ? "text-emerald-700 line-through opacity-80"
                          : isCurrent
                          ? "text-blue-700 font-semibold"
                          : "text-slate-400"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
