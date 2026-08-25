"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-black/50 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/[0.12] shadow-[0_10px_30px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
          : "bg-black/20 backdrop-blur-xl backdrop-saturate-150 border-b border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08] border border-white/20 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] backdrop-blur-md transition-transform group-hover:scale-105">
            <Sparkles className="h-4.5 w-4.5 text-purple-300" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white group-hover:text-purple-200 transition-colors">
            HireWise
          </span>
        </Link>

        {/* Navigation links with glass hover pills */}
        <nav className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-300">
          <a
            href="#how-it-works"
            className="px-3 py-1.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-all"
          >
            How It Works
          </a>
          <a
            href="#evidence-engine"
            className="px-3 py-1.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-all"
          >
            Evidence Engine
          </a>
          <a
            href="#sheets-sync"
            className="px-3 py-1.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-all"
          >
            Google Sheets
          </a>
          <a
            href="#security"
            className="px-3 py-1.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-all"
          >
            Security & Privacy
          </a>
          <a
            href="#pricing"
            className="px-3 py-1.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-all"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="px-3 py-1.5 rounded-full hover:bg-white/[0.08] hover:text-white transition-all"
          >
            FAQ
          </a>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/[0.08] rounded-full px-4 border border-transparent hover:border-white/15 transition-all"
            >
              Sign In
            </Button>
          </Link>

          <Link href="/signup">
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold rounded-full bg-white text-black hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.35)] transition-all px-4"
            >
              <span>Start Screening</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
