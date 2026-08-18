import Link from "next/link";
import { Sparkles, ShieldCheck } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white pt-12 pb-6 text-slate-500 text-xs overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">
              ScreenAI
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Autonomous Candidate Screening SaaS</span>
          </div>

          <div className="flex items-center gap-6 font-medium text-slate-600">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
              Recruiter Dashboard
            </Link>
            <Link href="/login" className="hover:text-blue-600 transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-blue-600 transition-colors">
              Create Company
            </Link>
          </div>
        </div>

        <div className="pt-8 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} ScreenAI Technologies, Inc. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>AES-256 Encrypted • Zero-Hallucination Verified • Human Hiring Authority</span>
          </div>
        </div>
      </div>

      {/* Full Last Large Brand Typography with 0.5 Black Opacity */}
      <div className="w-full text-center select-none pointer-events-none mt-2 overflow-hidden px-4">
        <h2 className="text-[13vw] sm:text-[14vw] font-black tracking-tighter leading-none text-black/50">
          Hirewise
        </h2>
      </div>
    </footer>
  );
}
