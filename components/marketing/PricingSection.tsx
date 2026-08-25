import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PricingSection() {
  const tiers = [
    {
      name: "Free Plan",
      price: "$0",
      period: "/month",
      desc: "Perfect for getting started with AI-assisted candidate screening.",
      highlight: false,
      features: [
        "Up to 3 Active Job Positions",
        "50 Candidate Screenings / mo",
        "Deterministic Matching & AI Parsing",
        "Evidence Citations & Reasonings",
        "17-Column Google Sheets Sync",
        "1 Recruiter Seat",
      ],
      cta: "Get Started Free",
      href: "/signup",
    },
    {
      name: "Upgrade to Pro",
      price: "$10",
      period: "/month",
      desc: "For recruiters and growing teams needing higher screening volume and custom policies.",
      highlight: true,
      badge: "Recommended",
      features: [
        "Unlimited Active Job Positions",
        "1,000 Candidate Screenings / mo",
        "Custom Scoring Weights & Strict Policies",
        "Evidence Verification Engine",
        "Automatic Real-Time Google Sheets Sync",
        "Unlimited Recruiter Seats",
        "Candidate Notes & Human Decision Audits",
      ],
      cta: "Upgrade to Pro",
      href: "/signup",
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-[#e7e5e2] border-t border-black/10 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#19191a]">
            Simple & Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            Screen Hundreds of Resumes in Minutes
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-3">
            Choose the plan that fits your hiring velocity. Cancel or change tiers anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all ${
                tier.highlight
                  ? "border-2 border-black bg-black text-white shadow-2xl relative lg:-translate-y-2 z-10"
                  : "border border-black/15 bg-[#dedbd6]/50 text-slate-900 hover:bg-[#dedbd6] hover:border-black/30 hover:shadow-xl relative"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-lg font-bold ${tier.highlight ? "text-white" : "text-slate-900"}`}>
                    {tier.name}
                  </h3>
                  {tier.badge && (
                    <span className="inline-flex items-center rounded-full bg-white/20 border border-white/30 px-3 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                      {tier.badge}
                    </span>
                  )}
                </div>

                <p className={`text-xs mt-1 ${tier.highlight ? "text-neutral-400" : "text-slate-600"}`}>
                  {tier.desc}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className={`text-4xl font-extrabold font-sans tracking-tight ${tier.highlight ? "text-white" : "text-slate-900"}`}>
                    {tier.price}
                  </span>
                  <span className={`text-xs font-medium ${tier.highlight ? "text-neutral-400" : "text-slate-500"}`}>
                    {tier.period}
                  </span>
                </div>

                <ul className="mt-8 space-y-3">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className={`flex items-start gap-2.5 text-xs ${tier.highlight ? "text-neutral-300" : "text-slate-700"}`}>
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 ${tier.highlight ? "text-white" : "text-black font-bold"}`} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`mt-8 pt-6 border-t ${tier.highlight ? "border-neutral-800" : "border-black/10"}`}>
                <Link href={tier.href}>
                  <Button
                    className={`w-full text-xs font-bold py-2.5 transition-all ${
                      tier.highlight
                        ? "bg-white text-black hover:bg-neutral-200 shadow-md border-0"
                        : "bg-[#dedbd6] text-[#19191a] border border-black/20 hover:border-black hover:bg-black hover:text-white shadow-xs"
                    }`}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
