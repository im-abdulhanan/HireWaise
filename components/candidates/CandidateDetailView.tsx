"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  FileText,
  Download,
  Calendar,
  Building,
  GraduationCap,
  Briefcase,
  Layers,
  Award,
  Globe,
  AlertTriangle,
  MessageSquare,
  Send,
  Sliders,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceCard } from "./EvidenceCard";
import { HumanStatusSelector } from "./HumanStatusSelector";
import { formatDate, formatDateTime } from "@/lib/utils";

interface CandidateDetailViewProps {
  data: {
    application: any;
    candidate: any;
    job: any;
    resume: any;
    screeningResult: any;
    requirementResults: any[];
    notes: any[];
  };
}

export function CandidateDetailView({ data }: CandidateDetailViewProps) {
  const { application, candidate, job, resume, screeningResult, requirementResults } = data;

  const [activeTab, setActiveTab] = useState<"evidence" | "resume" | "notes" | "telemetry">("evidence");
  const [notes, setNotes] = useState(data.notes || []);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const res = await fetch(`/api/candidates/${application.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setNotes([json.data, ...notes]);
        setNewNote("");
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setAddingNote(false);
    }
  };

  const score = screeningResult?.overallScore ?? 0;
  const category = screeningResult?.category || "POSSIBLE_MATCH";

  const categoryVariant =
    category === "STRONG_MATCH"
      ? "strongMatch"
      : category === "POSSIBLE_MATCH"
      ? "possibleMatch"
      : category === "DOES_NOT_MEET_STATED_REQUIREMENTS"
      ? "doesNotMeet"
      : "failed";

  const categoryLabel =
    category === "STRONG_MATCH"
      ? "Strong Match"
      : category === "POSSIBLE_MATCH"
      ? "Review Needed"
      : category === "DOES_NOT_MEET_STATED_REQUIREMENTS"
      ? "Does Not Meet"
      : "Failed";

  return (
    <div className="space-y-8 pb-16">
      {/* Top Candidate Profile Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {candidate?.name || "Candidate Profile"}
              </h1>
              <Badge variant={categoryVariant} className="text-xs py-1 px-3">
                {categoryLabel}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Briefcase className="h-4 w-4 text-slate-400" />
                Applied for {job?.title || "Job Position"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-slate-400" />
                {candidate?.email}
              </span>
              {candidate?.phone && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {candidate.phone}
                  </span>
                </>
              )}
              {candidate?.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {candidate.location}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
              <span>Submitted {formatDateTime(application?.appliedAt)}</span>
              <span>•</span>
              <span>Application ID: {application?.id}</span>
            </div>
          </div>

          {/* Right Action Box: Match Score Dial + Recruiter Status */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Overall Score
                </p>
                <p className="text-xs text-slate-500">Weighted Match</p>
              </div>

              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 font-bold shadow-xs ${
                  score >= 80
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : score >= 60
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : "border-rose-500 bg-rose-50 text-rose-800"
                }`}
              >
                <span className="text-2xl tracking-tight">{score}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <HumanStatusSelector
                applicationId={application.id}
                currentStatus={application.status || "NEW"}
              />

              {resume?.id && (
                <a
                  href={`/api/resumes/${resume.id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs shadow-xs">
                    <Download className="h-3.5 w-3.5" />
                    <span>Resume</span>
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("evidence")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "evidence"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>AI Evidence & Requirements ({requirementResults.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("resume")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "resume"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Structured Resume Profile</span>
        </button>

        <button
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "notes"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Recruiter Notes ({notes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "telemetry"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>AI Telemetry & Policy Snapshot</span>
        </button>
      </div>

      {/* TAB 1: EVIDENCE & REQUIREMENTS */}
      {activeTab === "evidence" && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          {screeningResult?.summary && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                AI Screening Executive Summary
              </h3>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                {screeningResult.summary}
              </p>
            </div>
          )}

          {/* Human Review Advisory Alert */}
          {screeningResult?.humanReviewRecommended && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Human Recruiter Review Recommended
                  </h4>
                  <ul className="mt-1 space-y-1 text-xs text-amber-800 list-disc list-inside">
                    {screeningResult.humanReviewReasons?.map((reason: string, i: number) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Weighted Dimension Breakdown Bar */}
          {screeningResult?.scoreBreakdown && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Score Dimension Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 text-center border border-slate-100">
                  <span className="text-[11px] text-slate-500">Required Skills</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {screeningResult.scoreBreakdown.skillsScore}%
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {screeningResult.matchedRequiredSkillsCount}/
                    {screeningResult.totalRequiredSkillsCount} matched
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-center border border-slate-100">
                  <span className="text-[11px] text-slate-500">Experience</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {screeningResult.scoreBreakdown.experienceScore}%
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {screeningResult.detectedExperienceYears} yrs detected
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-center border border-slate-100">
                  <span className="text-[11px] text-slate-500">Education</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {screeningResult.scoreBreakdown.educationScore}%
                  </p>
                  <span className="text-[10px] text-slate-400">Degree check</span>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-center border border-slate-100">
                  <span className="text-[11px] text-slate-500">Preferred Skills</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {screeningResult.scoreBreakdown.preferredSkillsScore}%
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {screeningResult.matchedPreferredSkillsCount}/
                    {screeningResult.totalPreferredSkillsCount} bonus
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-center border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-slate-500">Certifications</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {screeningResult.scoreBreakdown.otherScore}%
                  </p>
                  <span className="text-[10px] text-slate-400">Other criteria</span>
                </div>
              </div>
            </div>
          )}

          {/* Evidence Cards List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Requirement-by-Requirement Evidence Audit ({requirementResults.length})
            </h3>

            {requirementResults.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                No requirement results recorded for this screening.
              </div>
            ) : (
              <div className="space-y-3">
                {requirementResults.map((req) => (
                  <EvidenceCard
                    key={req.id}
                    requirementTitle={req.requirementTitle}
                    category={req.requirementCategory}
                    type={req.requirementType}
                    status={req.status}
                    evidenceQuote={req.evidenceQuote}
                    reasoning={req.reasoning}
                    confidence={req.confidence}
                    verifiedByAi={req.verifiedByAi}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STRUCTURED RESUME PROFILE */}
      {activeTab === "resume" && (
        <div className="space-y-8">
          {/* Candidate Summary */}
          {candidate?.summary && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                Professional Summary
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {candidate.summary}
              </p>
            </div>
          )}

          {/* Skills Matrix */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Extracted Skills & Competencies ({candidate?.skills?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {candidate?.skills?.map((skill: string, i: number) => (
                <span
                  key={i}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 border border-slate-200/60"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Work Experience Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-600" />
              Work History ({candidate?.experience?.length || 0} Roles • {candidate?.totalExperienceYears || 0} Years Total)
            </h3>

            <div className="space-y-6 relative border-l-2 border-slate-200 ml-3 pl-6">
              {candidate?.experience?.map((exp: any, i: number) => (
                <div key={i} className="relative group">
                  <div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-blue-600 bg-white" />

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-sm font-bold text-slate-900">
                        {exp.jobTitle}
                      </h4>
                      <span className="text-xs text-slate-400 font-mono">
                        {exp.startDate || "N/A"} — {exp.isCurrent ? "Present" : exp.endDate || "N/A"}
                        {exp.durationYears ? ` (${exp.durationYears} yrs)` : ""}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-blue-700 mt-0.5">
                      {exp.company}
                    </p>

                    {exp.description && (
                      <p className="text-xs text-slate-600 leading-relaxed mt-2 whitespace-pre-wrap font-sans">
                        {exp.description}
                      </p>
                    )}

                    {exp.skillsUsed && exp.skillsUsed.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {exp.skillsUsed.map((s: string, idx: number) => (
                          <span key={idx} className="rounded bg-blue-50 text-blue-700 text-[10px] font-medium px-2 py-0.5">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education & Credentials */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              Education & Academic Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {candidate?.education?.map((edu: any, i: number) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-sm font-bold text-slate-900">{edu.degree || "Degree"}</p>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">{edu.institution}</p>
                  {edu.fieldOfStudy && (
                    <p className="text-xs text-slate-500 mt-1">Major: {edu.fieldOfStudy}</p>
                  )}
                  {edu.graduationYear && (
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">Class of {edu.graduationYear}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RECRUITER NOTES */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          {/* Add Note Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Add Recruiter Note</h3>
            <form onSubmit={handleAddNote} className="space-y-3">
              <Textarea
                placeholder="Write private notes on interview feedback, follow-up questions, or qualification verifications..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                required
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={addingNote || !newNote.trim()} className="gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  <span>Post Note</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Notes History */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Note History ({notes.length})
            </h3>

            {notes.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                No recruiter notes added yet. Add internal feedback using the box above.
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-900">{note.authorName}</span>
                    <span className="text-slate-400">{formatDateTime(note.createdAt)}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {note.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AI TELEMETRY & POLICY SNAPSHOT */}
      {activeTab === "telemetry" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Version & Model Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Screening Execution Telemetry
              </h3>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Screening Version:</span>
                  <span className="font-mono font-bold text-slate-900">
                    v{screeningResult?.screeningVersion || 1}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>AI Model:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {screeningResult?.aiUsage?.model?.replace("gemini", "AI Engine") || "AI Engine"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Input Tokens:</span>
                  <span className="font-mono text-slate-900">
                    {screeningResult?.aiUsage?.inputTokens?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Output Tokens:</span>
                  <span className="font-mono text-slate-900">
                    {screeningResult?.aiUsage?.outputTokens?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Duration:</span>
                  <span className="font-mono text-slate-900">
                    {screeningResult?.aiUsage?.processingDurationMs
                      ? `${(screeningResult.aiUsage.processingDurationMs / 1000).toFixed(2)}s`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Estimated Cost:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    ${screeningResult?.aiUsage?.estimatedCostUsd || 0.0001} USD
                  </span>
                </div>
              </div>
            </div>

            {/* Weights Snapshot */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-600" />
                Scoring Weights Snapshot (v{screeningResult?.screeningVersion || 1})
              </h3>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Required Skills Weight:</span>
                  <span className="font-bold text-blue-600">
                    {screeningResult?.scoringWeightsSnapshot?.requiredSkillsWeight ?? 40}%
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Experience Weight:</span>
                  <span className="font-bold text-blue-600">
                    {screeningResult?.scoringWeightsSnapshot?.experienceWeight ?? 25}%
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Education Weight:</span>
                  <span className="font-bold text-blue-600">
                    {screeningResult?.scoringWeightsSnapshot?.educationWeight ?? 15}%
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Preferred Skills Weight:</span>
                  <span className="font-bold text-blue-600">
                    {screeningResult?.scoringWeightsSnapshot?.preferredSkillsWeight ?? 10}%
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Other/Certs Weight:</span>
                  <span className="font-bold text-blue-600">
                    {screeningResult?.scoringWeightsSnapshot?.otherWeight ?? 10}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
