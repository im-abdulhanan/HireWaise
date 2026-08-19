import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PricingSection() {
  const tiers = [
    {
      name: "Starter",
      price: "$49",
      period: "/month",
      desc: "Perfect for growing startups and boutique recruiting agencies.",
      highlight: false,
      features: [
        "Up to 3 Active Job Positions",
        "250 Candidate Screenings / mo",
        "Deterministic Matching & AI Parsing",
        "Evidence Citations & Reasonings",
        "17-Column Google Sheets Sync",
        "1 Recruiter Seat",
      ],
      cta: "Start Free Trial",
      href: "/signup",
    },
    {
      name: "Growth",
      price: "$149",
      period: "/month",
      desc: "For scaling engineering and recruiting teams handling high applicant volume.",
      highlight: true,
      badge: "Most Popular",
      features: [
        "Up to 15 Active Job Positions",
        "2,000 Candidate Screenings / mo",
        "Custom Scoring Weights & Strict Policies",
        "Evidence Verification Engine",
        "Automatic Real-Time Google Sheets Sync",
        "Unlimited Recruiter Seats",
        "Candidate Notes & Human Decision Audits",
      ],
      cta: "Get Started with Growth",
      href: "/signup",
    },
    {
      name: "Enterprise",
      price: "$499",
      period: "/month",
      desc: "For high-volume talent acquisition organizations requiring bespoke ATS integration.",
      highlight: false,
      features: [
        "Unlimited Active Job Positions",
        "Unlimited Candidate Screenings",
        "Dedicated AI Enterprise API Quota",
        "Custom ATS Integrations (Greenhouse, Lever)",
        "Single Sign-On (SSO / SAML)",
        "SOC2 Compliance Reports & 99.9% SLA",
        "Dedicated Account Architect",
      ],
      cta: "Contact Sales",
      href: "/signup",
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-[#e7e5e2] border-t border-black/10">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
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
                    className={`w-full text-xs font-bold py-2.5 transition-all border-0 ${
                      tier.highlight
                        ? "bg-white text-black hover:bg-neutral-200 shadow-md"
                        : "bg-[#dedbd6] text-[#19191a] hover:bg-black hover:text-white shadow-xs"
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
