"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FAQSection() {
  const faqs = [
    {
      q: "How does ScreenAI prevent AI hallucinations when screening resumes?",
      a: "ScreenAI implements a strict zero-hallucination verification stage. Every qualification match must be backed by a verbatim quote extracted from the source resume text. If evidence is ambiguous or missing, the system strictly marks the requirement as UNCLEAR or NOT_FOUND rather than guessing.",
    },
    {
      q: "Does ScreenAI make autonomous hiring or rejection decisions?",
      a: "No. ScreenAI is an explainable decision-support tool. It outputs objective evidence summaries, dimension scores, and review recommendations. Human recruiters retain 100% control to set candidate pipeline statuses (NEW, UNDER_REVIEW, SHORTLISTED, INTERVIEWING, REJECTED, HIRED).",
    },
    {
      q: "How does the 17-column Google Sheets integration work?",
      a: "You connect your Google Drive via standard OAuth 2.0 with AES-256 encrypted tokens. With one click, ScreenAI creates a structured 17-column Google Spreadsheet and synchronizes candidate match scores, matched/missing skills, evidence quotes, and recruiter pipeline statuses in real time.",
    },
    {
      q: "What file formats and sizes are supported?",
      a: "ScreenAI supports PDF and Microsoft Word (DOCX) files up to 10MB each. Every upload is validated through binary magic-byte inspection to prevent malformed or malicious files.",
    },
    {
      q: "How is candidate PII and company data secured?",
      a: "We enforce strict multi-tenant isolation. All queries derive company identity from server-side sessions, and Google OAuth tokens are encrypted at rest with AES-256-GCM. Candidate resumes and extracted text are only accessible to authenticated recruiters within your company.",
    },
    {
      q: "Can we configure custom screening policies and weights per job?",
      a: "Yes. Every job has its own dedicated Screening Policy where you can adjust weights (Required Skills, Experience, Education, Preferred Skills, Certifications) and toggle strict rule matching (such as requiring 100% of required skills or strict minimum years of experience).",
    },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-24 bg-[#e7e5e2] border-t border-black/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#19191a]">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            Everything You Need to Know
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-black/15 bg-[#dedbd6]/60 overflow-hidden shadow-xs hover:border-black/30 transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-slate-900 hover:text-[#19191a] transition-colors"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#19191a]" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-700 leading-relaxed border-t border-black/10">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
