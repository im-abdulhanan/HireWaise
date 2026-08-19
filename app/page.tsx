import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Zap,
  Sliders,
  Users,
  Search,
  Lock,
  FileText,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/Navbar";
import { InteractiveDemo } from "@/components/marketing/InteractiveDemo";
import { WorkflowSection } from "@/components/marketing/WorkflowSection";
import { SecuritySection } from "@/components/marketing/SecuritySection";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FAQSection } from "@/components/marketing/FAQSection";
import { MarketingFooter } from "@/components/marketing/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#e7e5e2] text-[#19191a] selection:bg-[#19191a] selection:text-white">
      {/* 1. Header & Navigation */}
      <MarketingNavbar />

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 sm:pt-28 sm:pb-36 bg-[#e7e5e2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-black/5 px-3.5 py-1 text-xs font-semibold text-[#19191a] shadow-xs mb-8">
            <Sparkles className="h-3.5 w-3.5 text-[#19191a]" />
            <span>Autonomous AI Screening & Deterministic Matching SaaS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#19191a] tracking-tight max-w-5xl mx-auto leading-[1.1]">
            Screen Candidates Faster With{" "}
            <span className="text-[#19191a]">AI-Powered</span> Resume Matching
          </h1>

          <p className="mt-6 max-w-3xl mx-auto text-base sm:text-lg text-slate-700 leading-relaxed font-normal">
            Automatically compare candidate resumes against exact job requirements, surface verified evidence quotes, and help recruiters focus immediately on the candidates who deserve a closer look.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-[#19191a] hover:bg-[#2b2b2d] text-white shadow-md px-8 py-3 text-sm font-bold">
                <span>Start Screening Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <a href="#interactive-demo">
              <Button size="lg" variant="outline" className="text-sm font-semibold px-6 py-3 bg-transparent border border-black/20 text-[#19191a] hover:bg-black hover:text-white">
                Inspect AI Evidence Demo
              </Button>
            </a>
          </div>

          {/* Social Proof / Security Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Zero-Hallucination Evidence
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              17-Column Google Sheets Sync
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-emerald-700" />
              Multi-Tenant Isolated
            </span>
          </div>
        </div>
      </section>

      {/* 3. The Problem Section */}
      <section className="py-20 bg-[#e7e5e2] border-y border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                The Recruitment Bottleneck
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Recruiters Spend 70% of Their Time Scanning Unqualified Resumes
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                A single job posting attracts hundreds of applications. Keyword ATS filters miss top talent while letting keyword-stuffed resumes slip through. Recruiters burn out manually reading 50-page stacks.
              </p>
              <div className="pt-2 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Manual keyword scanning leads to hiring fatigue and overlooked candidates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Black-box AI models generate hallucinations without transparent proof</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Disconnected spreadsheets cause pipeline chaos and lost candidate notes</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#19191a]">
                The ScreenAI Solution
              </span>
              <h3 className="text-xl font-bold text-slate-900">
                Deterministic Rule Precision + AI Verification
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                ScreenAI bridges the gap. We run deterministic qualification evaluations with customizable scoring weights, backed by AI-powered verbatim quote extraction. Every score is 100% explainable and verifiable by your human recruiters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Live Demo Visualizer */}
      <section id="interactive-demo" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <InteractiveDemo />
      </section>

      {/* 5. End-to-End Workflow & 6-Stage Pipeline */}
      <WorkflowSection />

      {/* 6. Google Sheets 17-Column Live Sync Highlight */}
      <section id="sheets-sync" className="py-24 bg-[#e7e5e2] border-t border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Real-Time Data Pipeline
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Enterprise 17-Column Live Google Sheets Sync
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                Keep your hiring team and stakeholders in sync without logging into another dashboard. Connect your Google account and ScreenAI automatically updates candidate scores, evidence quotes, and recruiter pipeline statuses.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="rounded-lg bg-emerald-100 text-emerald-800 text-xs font-medium px-3 py-1 border border-emerald-200">
                  OAuth 2.0 Connected
                </span>
                <span className="rounded-lg bg-emerald-100 text-emerald-800 text-xs font-medium px-3 py-1 border border-emerald-200">
                  AES-256 Token Encryption
                </span>
                <span className="rounded-lg bg-emerald-100 text-emerald-800 text-xs font-medium px-3 py-1 border border-emerald-200">
                  Auto-Formatted Columns
                </span>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl border border-black/15 bg-[#dedbd6]/50 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-black/10">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
                  <span className="font-bold text-xs text-slate-900">ScreenAI Live Pipeline Sheet</span>
                </div>
                <span className="text-[11px] text-emerald-800 font-medium bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                  Live Synced
                </span>
              </div>

              <div className="space-y-2 text-[11px] font-mono text-slate-800">
                <div className="p-2 rounded bg-white/70 border border-black/10 flex justify-between">
                  <span>Col 1-4: ID, Name, Email, Job</span>
                  <span className="text-slate-500">Identity</span>
                </div>
                <div className="p-2 rounded bg-white/70 border border-black/10 flex justify-between">
                  <span>Col 5-6: Match Score (94/100), AI Category</span>
                  <span className="text-[#19191a] font-bold">Evaluated</span>
                </div>
                <div className="p-2 rounded bg-white/70 border border-black/10 flex justify-between">
                  <span>Col 7-9: Matched Skills, Missing, Preferred</span>
                  <span className="text-slate-500">Skills</span>
                </div>
                <div className="p-2 rounded bg-white/70 border border-black/10 flex justify-between">
                  <span>Col 12-13: Evidence Summary, Confidence (98%)</span>
                  <span className="text-emerald-700 font-bold">Quotes</span>
                </div>
                <div className="p-2 rounded bg-white/70 border border-black/10 flex justify-between">
                  <span>Col 14-17: Recruiter Status, Timestamps, Version</span>
                  <span className="text-slate-500">Pipeline</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Enterprise Security & Privacy */}
      <SecuritySection />

      {/* 8. Pricing Tiers */}
      <PricingSection />

      {/* 9. FAQ Section */}
      <FAQSection />

      {/* 10. High-Impact Call to Action Card */}
      <section className="py-16 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-neutral-800 bg-black text-white p-8 sm:p-14 text-center space-y-6 shadow-2xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Transform Your Candidate Screening Today
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Stop wasting recruiter hours on keyword guesswork. Screen hundreds of candidates with explainable AI evidence and deterministic accuracy.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-black hover:bg-neutral-200 text-sm font-bold px-8 shadow-md">
                <span>Create Company Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-900 hover:text-white text-sm">
                Sign In to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <MarketingFooter />
    </div>
  );
}
