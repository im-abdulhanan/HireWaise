import {
  ShieldCheck,
  Lock,
  FileCheck,
  UserCheck,
  KeyRound,
  EyeOff,
} from "lucide-react";

export function SecuritySection() {
  const securityFeatures = [
    {
      icon: ShieldCheck,
      title: "Strict Multi-Tenant Isolation",
      desc: "Every database query, candidate record, resume document, and API call enforces verified server-side company authorization. Never trust client-supplied tenant identifiers.",
    },
    {
      icon: KeyRound,
      title: "AES-256 Encrypted OAuth Tokens",
      desc: "Google OAuth access and refresh tokens are encrypted at rest using AES-256-GCM server-side keys. Tokens are never exposed to browser bundles or logs.",
    },
    {
      icon: EyeOff,
      title: "Zero-Hallucination Evidence Rule",
      desc: "AI is strictly prohibited from fabricating candidate qualifications. Every positive match must cite verbatim text from the source resume or be marked UNCLEAR.",
    },
    {
      icon: Lock,
      title: "Prompt Injection Defense",
      desc: "Untrusted resume documents and job descriptions are isolated inside strict delimiter boundaries and audited against adversarial jailbreak attempts.",
    },
    {
      icon: UserCheck,
      title: "100% Human Final Decisions",
      desc: "AI screening outputs are explainable decision-support recommendations. Recruiters retain total control over shortlist, interview, and hiring decisions.",
    },
    {
      icon: FileCheck,
      title: "Immutable Policy Versioning",
      desc: "Every candidate screening result permanently records a snapshot of the exact criteria, weights, and screening version used during evaluation.",
    },
  ];

  return (
    <section id="security" className="py-24 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
            Enterprise Security & Trust
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
            Built from the Ground Up for Enterprise Compliance
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3">
            Your candidate data and organizational hiring policies are protected by bank-grade encryption and responsible AI guardrails.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-6 hover:border-slate-700 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
