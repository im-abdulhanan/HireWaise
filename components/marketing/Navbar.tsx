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
          ? "bg-black/70 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20"
          : "bg-black/25 backdrop-blur-md border-b border-white/10"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white shadow-sm backdrop-blur-md">
            <Sparkles className="h-5 w-5 text-purple-300" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            HireWise
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#evidence-engine" className="hover:text-white transition-colors">
            Evidence Engine
          </a>
          <a href="#sheets-sync" className="hover:text-white transition-colors">
            Google Sheets
          </a>
          <a href="#security" className="hover:text-white transition-colors">
            Security & Privacy
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10">
              Sign In
            </Button>
          </Link>

          <Link href="/signup">
            <Button size="sm" className="gap-1.5 text-xs font-semibold shadow-xs bg-white text-black hover:bg-neutral-200">
              <span>Start Screening</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
