import Link from "next/link";
import { Sparkles, ShieldCheck, ArrowUpRight, Lock } from "lucide-react";

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

        {/* Payment Methods Section */}
        <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-neutral-900">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Lock className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-semibold text-neutral-300">Accepted Payment Methods</span>
            <span className="text-neutral-600 hidden sm:inline">•</span>
            <span className="text-[11px] text-neutral-500 hidden sm:inline">256-bit Encrypted Checkout</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Visa */}
            <div
              className="h-8 px-3 rounded-lg bg-neutral-900/90 border border-neutral-800 flex items-center justify-center hover:border-neutral-700 hover:bg-neutral-900 transition-all shadow-xs"
              title="Visa"
            >
              <svg className="h-3.5 w-auto" viewBox="0 0 48 16" fill="none">
                <path
                  d="M19.2 1.2L12.6 15.6H8.4L5.1 3.5C4.9 2.7 4.7 2.4 4.1 2.1C3.1 1.6 1.5 1.1 0 0.8L0.1 0.4H7.2C8.1 0.4 8.9 1 9.1 2L10.8 11.2L15 1.2H19.2ZM36 10.6C36.1 6.5 30.5 6.3 30.5 4.5C30.5 3.9 31.1 3.2 32.3 3.1C32.9 3 34.6 2.9 36.4 3.7L37.1 0.6C36.1 0.2 34.8 0 33.2 0C29.2 0 26.3 2.1 26.3 5.2C26.3 7.5 28.3 8.7 29.9 9.5C31.5 10.3 32.1 10.8 32.1 11.5C32.1 12.6 30.8 13.1 29.6 13.1C27.5 13.1 26.3 12.8 24.8 12.1L24.1 15.4C25.3 15.9 27.4 16.4 29.5 16.4C33.8 16.4 36.6 14.3 36 10.6ZM46.6 15.6H50.3L47.1 0.4H43.7C42.9 0.4 42.2 0.8 41.9 1.6L35.8 15.6H40L40.8 13.3H45.9L46.6 15.6ZM42 10.3L44.1 4.5L45.3 10.3H42ZM25.2 0.4L21.9 15.6H17.9L21.2 0.4H25.2Z"
                  fill="#FFFFFF"
                />
              </svg>
            </div>

            {/* Mastercard */}
            <div
              className="h-8 px-3 rounded-lg bg-neutral-900/90 border border-neutral-800 flex items-center justify-center gap-1.5 hover:border-neutral-700 hover:bg-neutral-900 transition-all shadow-xs"
              title="Mastercard"
            >
              <svg className="h-4 w-6" viewBox="0 0 32 20" fill="none">
                <circle cx="10" cy="10" r="10" fill="#EB001B" />
                <circle cx="22" cy="10" r="10" fill="#F79E1B" fillOpacity="0.9" />
              </svg>
              <span className="text-[11px] font-bold text-white tracking-tight">mastercard</span>
            </div>

            {/* UnionPay */}
            <div
              className="h-8 px-3 rounded-lg bg-neutral-900/90 border border-neutral-800 flex items-center justify-center gap-1.5 hover:border-neutral-700 hover:bg-neutral-900 transition-all shadow-xs"
              title="UnionPay"
            >
              <div className="flex h-4 w-5 items-center justify-center overflow-hidden rounded-[2px] bg-[#004D7F] text-[8px] font-extrabold text-white">
                <span className="text-red-500 font-bold">U</span>
                <span className="text-cyan-400 font-bold">P</span>
              </div>
              <span className="text-[11px] font-bold text-white tracking-tight">UnionPay</span>
            </div>

            {/* Google Pay */}
            <div
              className="h-8 px-3 rounded-lg bg-neutral-900/90 border border-neutral-800 flex items-center justify-center gap-1.5 hover:border-neutral-700 hover:bg-neutral-900 transition-all shadow-xs"
              title="Google Pay"
            >
              <svg className="h-3.5 w-auto" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="text-[11px] font-medium text-white tracking-tight">Pay</span>
            </div>

            {/* Apple Pay */}
            <div
              className="h-8 px-3 rounded-lg bg-neutral-900/90 border border-neutral-800 flex items-center justify-center gap-1 hover:border-neutral-700 hover:bg-neutral-900 transition-all shadow-xs"
              title="Apple Pay"
            >
              <svg className="h-4 w-4 fill-white shrink-0 -mt-0.5" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.87-.92.04-2.02.62-2.66 1.37-.56.65-1.06 1.71-.93 2.74 1.04.08 2.07-.49 2.67-1.24z" />
              </svg>
              <span className="text-[11px] font-semibold text-white tracking-tight">Pay</span>
            </div>

            {/* Bitcoin */}
            <div
              className="h-8 px-3 rounded-lg bg-neutral-900/90 border border-neutral-800 flex items-center justify-center gap-1.5 hover:border-neutral-700 hover:bg-neutral-900 transition-all shadow-xs"
              title="Bitcoin"
            >
              <svg className="h-4 w-4" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#F7931A" />
                <path
                  d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.53-.792.408.018.025-1.256-.314-1.256-.314L8.5 22.062l2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.704 2.82 1.728.432.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.54zm-3.945 5.553c-.535 2.146-4.152.986-5.325.694l.95-3.81c1.173.293 4.928.872 4.375 3.116zm.536-5.59c-.488 1.954-3.502.962-4.48.718l.861-3.454c.978.244 4.125.7 3.619 2.736z"
                  fill="#FFFFFF"
                />
              </svg>
              <span className="text-[11px] font-bold text-white tracking-tight">Bitcoin</span>
            </div>
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
