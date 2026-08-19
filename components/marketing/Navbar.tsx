"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/10 bg-[#faf8f5]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#19191a] text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#19191a]">
            ScreenAI
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
            How It Works
          </a>
          <a href="#evidence-engine" className="hover:text-slate-900 transition-colors">
            Evidence Engine
          </a>
          <a href="#sheets-sync" className="hover:text-slate-900 transition-colors">
            Google Sheets
          </a>
          <a href="#security" className="hover:text-slate-900 transition-colors">
            Security & Privacy
          </a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-slate-900 transition-colors">
            FAQ
          </a>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs font-semibold">
              Sign In
            </Button>
          </Link>

          <Link href="/signup">
            <Button size="sm" className="gap-1.5 text-xs font-semibold shadow-xs">
              <span>Start Screening</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
