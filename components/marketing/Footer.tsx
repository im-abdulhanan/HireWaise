import Link from "next/link";
import { Sparkles, ShieldCheck, ArrowUpRight } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-neutral-900 bg-black text-neutral-400 text-xs overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Top Footer Navigation & Branding */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-neutral-900">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-black font-bold shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Hirewise
              </span>
            </div>
            <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
              Autonomous AI Candidate Qualification & Screening SaaS. Deterministic evaluation rules, verifiable evidence citations, and seamless ATS workflows.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Product</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="#interactive-demo" className="hover:text-white transition-colors">
                  Interactive Demo
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-white transition-colors">
                  Screening Pipeline
                </Link>
              </li>
              <li>
                <Link href="#sheets-sync" className="hover:text-white transition-colors">
                  Google Sheets Sync
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition-colors">
                  Pricing Plans
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1">
                  <span>Recruiter Portal</span>
                  <ArrowUpRight className="h-3 w-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <span className="flex items-center gap-1.5 text-emerald-500 font-medium pt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Systems Operational
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Middle Legal / Security Row */}
        <div className="py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500 border-b border-neutral-900/80">
          <p>© {new Date().getFullYear()} Hirewise Inc. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>AES-256 Encrypted • Zero-Hallucination Evidence Verified • Human Authority</span>
          </div>
        </div>
      </div>

      {/* Massive Big Typography Wordmark at the Full Last (Labs.google inspired) */}
      <div className="w-full select-none overflow-hidden pt-6 pb-0 text-center border-t border-neutral-900/40">
        <h1 className="text-[17vw] font-extrabold tracking-tighter leading-none text-neutral-900 hover:text-neutral-800 transition-colors pointer-events-none select-none uppercase">
          Hirewise
        </h1>
      </div>
    </footer>
  );
}
