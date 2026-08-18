"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DEMO_CANDIDATES = [
  {
    name: "Elena Rostova",
    role: "Senior Backend Engineer",
    score: 94,
    category: "STRONG_MATCH",
    categoryLabel: "Strong Match",
    experience: "6.5 yrs",
    skills: ["Node.js", "PostgreSQL", "Distributed Systems", "Docker", "AWS"],
    education: "M.S. in Computer Science (MIT)",
    summary:
      "Meets 5/5 core requirements. Extensive production experience with distributed backend architectures.",
    evidence: [
      {
        req: "Node.js & TypeScript REST APIs",
        status: "MATCHED",
        quote: "Architected microservices handling 45k req/sec using Node.js, TypeScript, and Express.",
        reasoning: "Confirmed direct senior backend engineering experience with Node.js & TypeScript.",
        conf: "98%",
      },
      {
        req: "PostgreSQL & Database Design",
        status: "MATCHED",
        quote: "Optimized complex PostgreSQL query execution plans, reducing p99 latency by 35%.",
        reasoning: "Demonstrates advanced SQL optimization and database architecture.",
        conf: "95%",
      },
      {
        req: "4+ Years Professional Experience",
        status: "MATCHED",
        quote: "Total detected experience: 6.5 years across Apex Systems and CloudScale Inc.",
        reasoning: "6.5 years detected vs 4.0 years required.",
        conf: "99%",
      },
    ],
  },
  {
    name: "Marcus Vance",
    role: "Senior Backend Engineer",
    score: 68,
    category: "POSSIBLE_MATCH",
    categoryLabel: "Review Needed",
    experience: "3.2 yrs",
    skills: ["Node.js", "MongoDB", "Express", "React"],
    education: "B.S. in Software Engineering",
    summary:
      "Meets 3/5 requirements. Strong Node.js foundation; slight shortfall in experience years and PostgreSQL confirmation.",
    evidence: [
      {
        req: "Node.js & TypeScript REST APIs",
        status: "MATCHED",
        quote: "Developed backend APIs using Node.js and Express for consumer fintech app.",
        reasoning: "Demonstrates solid Node.js REST API development experience.",
        conf: "92%",
      },
      {
        req: "PostgreSQL & Database Design",
        status: "PARTIAL",
        quote: "Worked with NoSQL and relational database stores in production.",
        reasoning: "Generic relational database experience mentioned; exact PostgreSQL depth unconfirmed.",
        conf: "75%",
      },
      {
        req: "4+ Years Professional Experience",
        status: "PARTIAL",
        quote: "Total detected experience: 3.2 years across 2 startup roles.",
        reasoning: "Shortfall: 3.2 yrs detected vs 4.0 yrs required.",
        conf: "90%",
      },
    ],
  },
  {
    name: "David Miller",
    role: "Senior Backend Engineer",
    score: 42,
    category: "DOES_NOT_MEET_STATED_REQUIREMENTS",
    categoryLabel: "Does Not Meet",
    experience: "1.5 yrs",
    skills: ["Python", "Django", "HTML", "CSS"],
    education: "B.A. in Digital Arts",
    summary:
      "Does not meet core requirements. Lacks required Node.js backend stack and minimum required experience.",
    evidence: [
      {
        req: "Node.js & TypeScript REST APIs",
        status: "NOT_FOUND",
        quote: "",
        reasoning: "No Node.js or TypeScript experience detected in candidate work history.",
        conf: "95%",
      },
      {
        req: "PostgreSQL & Database Design",
        status: "NOT_FOUND",
        quote: "",
        reasoning: "No PostgreSQL database management experience cited.",
        conf: "90%",
      },
      {
        req: "4+ Years Professional Experience",
        status: "NOT_FOUND",
        quote: "Total detected experience: 1.5 years.",
        reasoning: "1.5 yrs detected vs 4.0 yrs required.",
        conf: "98%",
      },
    ],
  },
];

export function InteractiveDemo() {
  const [selectedCandidate, setSelectedCandidate] = useState(DEMO_CANDIDATES[0]);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-slate-900 text-white p-6 sm:p-10 shadow-2xl overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-white" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Live AI Evidence & Deterministic Matching Visualizer
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Click candidates below to inspect verified evidence quotes and explainable scoring math.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-400">Deterministic Engine Active</span>
        </div>
      </div>

      {/* Candidate Selector Tabs */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DEMO_CANDIDATES.map((cand) => {
          const isSelected = selectedCandidate.name === cand.name;
          return (
            <button
              key={cand.name}
              onClick={() => setSelectedCandidate(cand)}
              className={`rounded-2xl p-4 text-left transition-all border ${
                isSelected
                  ? "border-white bg-slate-800 shadow-lg"
                  : "border-slate-800 bg-slate-900/60 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-white">{cand.name}</p>
                <span
                  className={`flex h-7 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                    cand.score >= 80
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : cand.score >= 60
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  }`}
                >
                  {cand.score}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{cand.experience} • {cand.categoryLabel}</p>
            </button>
          );
        })}
      </div>

      {/* Selected Candidate Audit Card */}
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h4 className="text-xl font-bold text-white">{selectedCandidate.name}</h4>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  selectedCandidate.category === "STRONG_MATCH"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : selectedCandidate.category === "POSSIBLE_MATCH"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                }`}
              >
                {selectedCandidate.categoryLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{selectedCandidate.summary}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-extrabold text-white">{selectedCandidate.score}/100</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Weighted Score</p>
            </div>
          </div>
        </div>

        {/* Evidence List */}
        <div className="mt-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Requirement Evidence Audit:
          </p>

          <div className="space-y-3">
            {selectedCandidate.evidence.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.status === "MATCHED" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : item.status === "PARTIAL" ? (
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400" />
                    )}
                    <span className="font-semibold text-white">{item.req}</span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {item.conf} confidence
                  </span>
                </div>

                {item.quote && (
                  <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800/80 italic text-slate-300 font-serif">
                    <Quote className="h-3 w-3 inline text-slate-400 mr-1 rotate-180" />
                    "{item.quote}"
                  </div>
                )}

                <p className="text-slate-400">
                  <strong className="text-slate-300">Reasoning:</strong> {item.reasoning}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
