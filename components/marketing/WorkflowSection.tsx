import {
  FileText,
  Sparkles,
  Sliders,
  CheckCircle2,
  Database,
  ShieldCheck,
  Zap,
  ArrowRight,
} from "lucide-react";

export function WorkflowSection() {
  const steps = [
    {
      num: "01",
      title: "Create Job & Extract Criteria",
      desc: "Paste your raw job description. AI structured parsing automatically segments required vs preferred qualifications, experience years, and degree expectations.",
    },
    {
      num: "02",
      title: "Candidates Apply Directly",
      desc: "Candidates upload PDF or DOCX resumes through your branded application portal with zero signup friction and sliding-window rate limiting.",
    },
    {
      num: "03",
      title: "Autonomous Evidence Screening",
      desc: "Our dual-layer engine runs deterministic qualification rule matching and AI citation verification to extract verbatim evidence quotes.",
    },
    {
      num: "04",
      title: "Recruiters Make Informed Decisions",
      desc: "Review transparent match cards, compare scores, write private evaluation notes, and set final hiring pipeline decisions with full human authority.",
    },
  ];

  const pipelineStages = [
    { name: "Document Parsing", desc: "PDF/DOCX magic-byte validation & clean text normalization" },
    { name: "AI Resume Extraction", desc: "Structured extraction of timeline, skills, and education" },
    { name: "Deterministic Rule Matcher", desc: "Synonym normalization and strict threshold evaluation" },
    { name: "AI Evidence Verifier", desc: "Zero-hallucination quote audit against raw resume text" },
    { name: "Scoring & Policy Snapshot", desc: "5-dimension weighted scoring and immutable policy versioning" },
    { name: "Live Data Sync", desc: "Instant updates to recruiter dashboard and 17-column Google Sheet" },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#19191a]">
            End-to-End Recruitment Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            From Raw Job Description to Verified Candidate Shortlist
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-3">
            Say goodbye to keyword buzzword bingo. ScreenAI pairs deterministic rule precision with transparent AI evidence auditing.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {steps.map((step) => (
            <div
              key={step.num}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 relative hover:bg-white hover:shadow-lg hover:border-slate-300 transition-all group"
            >
              <span className="text-3xl font-extrabold text-[#19191a] font-mono">
                {step.num}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-4 mb-2">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Staged Pipeline Architecture Banner */}
        <div className="rounded-3xl border border-slate-300 bg-slate-100/60 p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#19191a]">
              Under the Hood Architecture
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              6-Stage Deterministic + AI Pipeline
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Every applicant passes through 6 specialized stages with zero fabrication guarantees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pipelineStages.map((stage, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/80 bg-white p-5 shadow-xs"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#19191a] text-white font-mono text-xs font-bold">
                    {idx + 1}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{stage.name}</h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {stage.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
