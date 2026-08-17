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
        "Deterministic Matching & Gemini Parsing",
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
        "Dedicated Gemini Enterprise API Quota",
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
    <section id="pricing" className="py-24 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Simple & Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            Screen Hundreds of Resumes in Minutes
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-3">
            Choose the plan that fits your hiring velocity. Cancel or change tiers anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all ${
                tier.highlight
                  ? "border-2 border-blue-600 bg-white shadow-xl shadow-blue-500/10 relative"
                  : "border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg"
              }`}
            >
              {tier.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                  {tier.badge}
                </span>
              )}

              <div>
                <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{tier.desc}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 font-sans tracking-tight">
                    {tier.price}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {tier.period}
                  </span>
                </div>

                <ul className="mt-8 space-y-3">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <Link href={tier.href}>
                  <Button
                    variant={tier.highlight ? "default" : "outline"}
                    className={`w-full text-xs font-semibold ${
                      tier.highlight ? "shadow-md shadow-blue-500/20" : ""
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
