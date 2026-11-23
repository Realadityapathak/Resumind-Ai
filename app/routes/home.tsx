import { Fragment, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import Navbar from "~/components/layout/Navbar";
import ScoreGauge from "~/components/ui/ScoreGauge";
import ScoreBadge from "~/components/ui/ScoreBadge";
import { Accordion, AccordionItem, AccordionHeader, AccordionContent } from "~/components/ui/Accordion";
import { usePuterStore } from "~/services/puter/store";
import { useScrollReveal } from "~/hooks/useScrollReveal";
import Icon, { type IconName } from "~/components/ui/Icon";

export function meta() {
  return [
    { title: "Resumind | Land 3.2x More Interviews with AI Resume Intelligence" },
    {
      name: "description",
      content:
        "Resumind diagnoses ATS parsing flaws, quantifies weak bullet points with the STAR method, and tailors your resume for any target job description.",
    },
  ];
}

const heroWords = [
  { text: "Land", accent: false },
  { text: "3.2x", accent: true },
  { text: "More", accent: true },
  { text: "Interviews", accent: false },
  { text: "with", accent: false },
  { text: "AI", accent: false },
  { text: "Resume", accent: false },
  { text: "Intelligence", accent: false },
];

const metrics = [
  { value: "25,000+", label: "Resumes analyzed and optimized", testId: "metric-resumes", accent: false },
  { value: "98%", label: "ATS pass rate on Workday and Lever", testId: "metric-passrate", accent: true },
  { value: "3.2x", label: "Increase in recruiter callbacks", testId: "metric-callbacks", accent: false },
  { value: "< 15s", label: "Fast multi-page AI evaluation", testId: "metric-latency", accent: false },
];

const secondaryFeatures: {
  title: string;
  copy: string;
  icon: IconName;
  tags: string[];
  note?: string;
}[] = [
  {
    title: "AI-Powered STAR Method Rewriter",
    copy: "Turns passive responsibilities into Situation-Task-Action-Result bullets, then offers three tones for the same achievement.",
    icon: "pen",
    tags: ["Metrics-focused", "Leadership-focused", "Technical-depth"],
  },
  {
    title: "Target Job Keyword Gap Matcher",
    copy: "A side-by-side matrix of your resume against the posting, so you can see which requirements are present and which are silent.",
    icon: "target",
    tags: ["React", "TypeScript", "Vite", "CI/CD", "Distributed systems"],
  },
  {
    title: "Tailored Cover Letter Generator",
    copy: "A specific, human-sounding letter built from the role and the company mission, ready for the clipboard or a markdown file.",
    icon: "file",
    tags: ["Clipboard copy", "Markdown export"],
  },
  {
    title: "Interactive AI Copilot Assistant",
    copy: "Ask the questions that keep you up at night, with your resume and the target job already in context.",
    icon: "message",
    tags: ["Career strategy", "Interview framing"],
    note: "How should I frame my legacy migration project to match this company's cloud-native stack?",
  },
];

const faqs = [
  {
    id: "faq-1",
    question: "What is an ATS score and how is it calculated?",
    answer:
      "Applicant Tracking Systems (ATS) filter resumes before recruiters read them. Resumind evaluates parsing compatibility, structural headers, keyword relevance, and quantified impact on a 0–100 scale using Google Gemini 2.5 Flash.",
  },
  {
    id: "faq-2",
    question: "Is my resume data private and confidential?",
    answer:
      "Yes, 100%. Resumind is built on Puter.js serverless architecture. Your resume text, thumbnails, and evaluations are stored securely within your own Puter Cloud storage sandbox. Zero centralized backend databases store or sell your data.",
  },
  {
    id: "faq-3",
    question: "How does the STAR Method Rewriter work?",
    answer:
      "STAR stands for Situation, Task, Action, and Result. Our AI analyzes your raw resume bullets and transforms them into 3 tailored variants: Metrics-focused, Leadership-focused, and Technical-depth.",
  },
  {
    id: "faq-4",
    question: "Does Resumind support multi-page and scanned PDF resumes?",
    answer:
      "Yes. Resumind uses client-side pdfjs-dist to parse multi-page documents and generate high-DPI page previews. For scanned documents, it falls back to optical OCR via Puter AI.",
  },
  {
    id: "faq-5",
    question: "Is Resumind really free to use?",
    answer:
      "Yes, Resumind is free. Powered by Puter.js serverless cloud infrastructure and Google Gemini 2.5 Flash, you get full access to every feature by signing into your Puter account.",
  },
  {
    id: "faq-6",
    question: "Can I tailor different resumes for different job applications?",
    answer:
      "Absolutely. Every resume upload can be paired with a unique company name and job description. Your dashboard saves each evaluation independently so you can track and compare applications.",
  },
];

const scoreDimensions = [
  { label: "Tone & Style", score: 88 },
  { label: "Content & STAR depth", score: 94 },
  { label: "Structure", score: 90 },
  { label: "Skills density", score: 78 },
];

export default function Home() {
  const { auth } = usePuterStore();
  const [previewMode, setPreviewMode] = useState<"before" | "after">("after");

  useScrollReveal();

  const isAuth = auth.isAuthenticated;

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Navbar />

      {/* HERO */}
      <section className="w-full border-b border-rule">
        <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[1.17fr_0.83fr] lg:items-start lg:gap-16 lg:pt-20">
          <div className="max-w-2xl">
            <p className="eyebrow hero-rise" style={{ "--delay": "40ms" } as CSSProperties}>
              AI resume intelligence
            </p>

            <h1 className="mt-6 !text-[clamp(2.85rem,6vw,4.9rem)] !leading-[0.94] !tracking-[-0.055em] text-balance">
              {heroWords.map((word, index) => (
                <Fragment key={word.text}>
                  <span
                    className={`hero-word ${word.accent ? "text-cobalt" : ""}`}
                    style={{ "--word": index } as CSSProperties}
                  >
                    {word.text}
                  </span>{" "}
                </Fragment>
              ))}
            </h1>

            <p
              className="hero-rise mt-7 max-w-xl text-[16px] leading-[1.7] text-ink-2 sm:text-[17px]"
              style={{ "--delay": "300ms" } as CSSProperties}
            >
              Resumind reads your resume the way an ATS does, then shows its work: parsing failures,
              weak bullet points, and the exact keywords standing between you and the role.
            </p>

            <div
              className="hero-rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
              style={{ "--delay": "370ms" } as CSSProperties}
            >
              <Link
                to={isAuth ? "/dashboard" : "/upload"}
                className="primary-button w-full !px-6 !py-3.5 text-[15px] sm:w-auto"
              >
                Analyze Your Resume Free →
              </Link>
              <a href="#how-it-works" className="secondary-button w-full !border-rule !px-6 !py-3.5 text-[15px] sm:w-auto">
                See How It Works
                <Icon name="chevron-down" size={16} className="text-ink-4" />
              </a>
            </div>

            <p
              className="hero-rise mt-5 text-[12px] leading-relaxed text-ink-3"
              style={{ "--delay": "440ms" } as CSSProperties}
            >
              PDF, up to 20 MB. Stored in your own Puter Cloud account, not a central résumé database.
            </p>

            <div
              className="hero-rise mt-12 grid max-w-lg grid-cols-3 gap-px border border-rule bg-rule"
              style={{ "--delay": "510ms" } as CSSProperties}
            >
              <div className="bg-paper px-4 py-3">
                <p className="text-[11px] text-ink-3">Highest score</p>
                <p className="mt-1 text-[20px] font-semibold tabular-nums">92<span className="text-[11px] text-ink-3">/100</span></p>
              </div>
              <div className="bg-paper px-4 py-3">
                <p className="text-[11px] text-ink-3">Keywords found</p>
                <p className="mt-1 text-[20px] font-semibold tabular-nums">98<span className="text-[11px] text-ink-3">%</span></p>
              </div>
              <div className="bg-paper px-4 py-3">
                <p className="text-[11px] text-ink-3">Pages read</p>
                <p className="mt-1 text-[20px] font-semibold tabular-nums">Multi</p>
              </div>
            </div>
          </div>

          {/* Review sheet */}
          <div className="hero-sheet w-full border border-rule bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cobalt" />
                <span className="text-[12px] font-semibold text-ink">ATS readiness</span>
              </div>
              <div className="flex border border-rule bg-paper p-0.5 rounded-[2px]" role="group" aria-label="Score preview mode">
                <button
                  type="button"
                  onClick={() => setPreviewMode("before")}
                  className={`min-h-[44px] px-2.5 py-1.5 text-[11px] font-semibold rounded-[1px] transition-colors cursor-pointer sm:min-h-[30px] ${
                    previewMode === "before"
                      ? "bg-cobalt text-paper"
                      : "text-ink-3 hover:text-ink"
                  }`}
                >
                  Before (54)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("after")}
                  className={`min-h-[44px] px-2.5 py-1.5 text-[11px] font-semibold rounded-[1px] transition-colors cursor-pointer sm:min-h-[30px] ${
                    previewMode === "after"
                      ? "bg-cobalt text-paper"
                      : "text-ink-3 hover:text-ink"
                  }`}
                >
                  After (92)
                </button>
              </div>
            </div>

            <div
              key={previewMode}
              className="score-swap grid grid-cols-1 gap-5 border-b border-rule p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-7 sm:p-6"
            >
              <ScoreGauge score={previewMode === "after" ? 92 : 54} />
              <div>
                <ScoreBadge score={previewMode === "after" ? 92 : 54} variant="label" />
                <p className="mt-3 text-[15px] font-semibold text-ink">
                  {previewMode === "after" ? "Interview-ready structure" : "Before the rewrite"}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                  {previewMode === "after"
                    ? "Single column, quantified bullets, and the target role's language."
                    : "The same experience, read through a parser-unfriendly layout."}
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-ink-3">Diagnostic notes</p>
                <p className="text-[11px] text-ink-4">Live comparison</p>
              </div>

              <div key={previewMode} className="score-swap score-stagger mt-3 space-y-3">
                {previewMode === "before" ? (
                  <>
                    <div className="flex items-start gap-2.5 text-[12px] leading-relaxed text-red-700">
                      <Icon name="close" size={14} className="mt-0.5 shrink-0 text-red-600" />
                      <span>8 critical ATS keywords missing for target role</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[12px] leading-relaxed text-red-700">
                      <Icon name="close" size={14} className="mt-0.5 shrink-0 text-red-600" />
                      <span>Task-based bullet points ("Responsible for API bugs")</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[12px] leading-relaxed text-amber-700">
                      <Icon name="alert" size={14} className="mt-0.5 shrink-0 text-amber-600" />
                      <span>Multi-column formatting breaks recruiter parsers</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5 text-[12px] leading-relaxed text-emerald-800">
                      <Icon name="check" size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                      <span>98% ATS keyword alignment for target role</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[12px] leading-relaxed text-emerald-800">
                      <Icon name="check" size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                      <span>STAR-quantified impact ("Architected microservices reducing latency by 42%")</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[12px] leading-relaxed text-emerald-800">
                      <Icon name="check" size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                      <span>100% single-column ATS-friendly semantic structure</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-rule px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-ink-3">Source document</p>
                <p className="text-[11px] text-ink-4">Page 1 of 2</p>
              </div>
              <div className="hero-sheet-media mt-2.5 h-[168px] overflow-hidden border border-rule bg-white">
                <img
                  src="/images/resume_03.png"
                  alt="A sample resume page reviewed by Resumind"
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS LEDGER */}
      <section className="w-full">
        <div className="mx-auto max-w-[1240px] px-0 sm:px-8">
          <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule lg:grid-cols-4">
            {metrics.map((metric, index) => (
              <div
                key={metric.testId}
                className="bg-paper px-5 py-7 sm:px-7 sm:py-9"
                data-reveal="soft"
                style={{ "--reveal-delay": `${index * 70}ms` } as CSSProperties}
              >
                <p
                  className={`figure-rise text-[34px] font-semibold leading-none tracking-[-0.04em] tabular-nums sm:text-[44px] ${
                    metric.accent ? "text-cobalt" : "text-ink"
                  }`}
                  data-testid={metric.testId}
                >
                  {metric.value}
                </p>
                <p className="mt-3 max-w-[180px] text-[12px] leading-snug text-ink-3">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE CLOSE-UPS */}
      <section id="features" className="w-full">
        <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-6 border-b border-rule pb-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div data-reveal="up">
              <p className="eyebrow">The workbench</p>
              <h2 className="mt-4 !text-[clamp(2rem,4.4vw,3.4rem)] !leading-[1.02] !tracking-[-0.045em] text-balance">
                Five passes over the same resume.
              </h2>
            </div>
            <p
              className="max-w-xl text-[15px] leading-[1.7] text-ink-3 lg:justify-self-end"
              data-reveal="soft"
              style={{ "--reveal-delay": "80ms" } as CSSProperties}
            >
              Each tool examines a different layer: how the document parses, how the bullets read,
              which words are missing, and what to say next. Nothing is guessed at the surface.
            </p>
          </div>

          <div className="mt-10 grid border border-rule lg:grid-cols-12">
            <div
              className="border-b border-rule p-6 sm:p-9 lg:col-span-5 lg:border-b-0 lg:border-r"
              data-reveal="soft"
            >
              <div className="flex items-start justify-between gap-6">
                <span className="text-[12px] font-medium text-ink-3">01 / Diagnostic</span>
                <span className="flex h-9 w-9 items-center justify-center border border-rule bg-surface text-cobalt">
                  <Icon name="chart" size={17} />
                </span>
              </div>
              <h3 className="mt-10 text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.04] tracking-[-0.04em]">
                Smart ATS Diagnostic Scoring
              </h3>
              <p className="mt-4 max-w-md text-[14px] leading-[1.75] text-ink-3">
                Instant 0–100 scoring across tone and style, content depth, structural formatting,
                and skill density. Each dimension explains the number instead of leaving you to guess.
              </p>
              <Link
                to="/upload"
                className="group mt-7 inline-flex items-center gap-2 text-[13px] font-semibold text-cobalt hover:text-cobalt-deep"
              >
                Run a diagnostic
                <Icon
                  name="arrow-right"
                  size={15}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <div className="bg-surface p-6 sm:p-9 lg:col-span-7">
              <div className="flex items-center justify-between border-b border-rule pb-3">
                <p className="text-[12px] font-medium text-ink-3">Dimension</p>
                <p className="text-[12px] font-medium text-ink-3">Weighted score</p>
              </div>
              <div className="mt-6 space-y-5">
                {scoreDimensions.map((dimension) => (
                  <div key={dimension.label}>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-[13px] font-medium text-ink-2">{dimension.label}</p>
                      <p className="text-[15px] font-semibold tabular-nums text-ink">{dimension.score}</p>
                    </div>
                    <div className="mt-2 h-[3px] w-full bg-rule">
                      <div className="meter-fill h-full origin-left bg-cobalt" style={{ width: `${dimension.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-7 border-t border-rule pt-4 text-[11px] leading-relaxed text-ink-3">
                A single score is useful. A score with a reason is actionable.
              </p>
            </div>
          </div>

          <div className="grid gap-px border-x border-b border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
            {secondaryFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className="group flex flex-col bg-paper p-6 transition-colors duration-200 hover:bg-surface-2"
                data-reveal="soft"
                style={{ "--reveal-delay": `${index * 70}ms` } as CSSProperties}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex text-cobalt transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                    <Icon name={feature.icon} size={19} />
                  </span>
                  <span className="text-[11px] tabular-nums text-ink-4">
                    {String(index + 2).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-8 text-[17px] leading-snug tracking-[-0.02em]">{feature.title}</h3>
                <p className="mt-3 flex-1 text-[12px] leading-[1.7] text-ink-3">{feature.copy}</p>

                <div className="mt-6 flex flex-wrap gap-1.5">
                  {feature.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-rule bg-surface px-1.5 py-1 text-[10px] font-medium text-ink-3"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {feature.note && (
                  <p className="mt-5 border-l border-cobalt pl-3 text-[11px] leading-relaxed text-ink-3 italic">
                    “{feature.note}”
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / STAGES */}
      <section id="how-it-works" className="w-full border-y border-rule bg-surface">
        <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div data-reveal="up">
              <p className="eyebrow">The process</p>
              <h2 className="mt-4 !text-[clamp(2rem,4.4vw,3.4rem)] !leading-[1.02] !tracking-[-0.045em]">
                From PDF to interview-ready in three passes.
              </h2>
            </div>
            <p
              className="max-w-lg text-[15px] leading-[1.7] text-ink-3 lg:justify-self-end"
              data-reveal="soft"
              style={{ "--reveal-delay": "80ms" } as CSSProperties}
            >
              No blank prompt, no generic advice. Every stage ends with a concrete artifact you can
              use in the next application.
            </p>
          </div>

          <div className="mt-12 grid gap-px border border-rule bg-rule md:grid-cols-3">
            <div
              className="bg-surface p-6 sm:p-8"
              data-reveal="soft"
              style={{ "--reveal-delay": "0ms" } as CSSProperties}
            >
              <p className="text-[44px] font-semibold leading-none tracking-[-0.05em] text-ink-4/60 tabular-nums">01</p>
              <h3 className="mt-10 text-[19px] tracking-[-0.02em]">Upload your PDF resume</h3>
              <p className="mt-3 text-[13px] leading-[1.7] text-ink-3">
                Drag in a PDF. The client-side parser extracts multi-page text and renders crisp page
                previews before anything leaves your browser.
              </p>
            </div>
            <div
              className="bg-surface p-6 sm:p-8"
              data-reveal="soft"
              style={{ "--reveal-delay": "80ms" } as CSSProperties}
            >
              <p className="text-[44px] font-semibold leading-none tracking-[-0.05em] text-ink-4/60 tabular-nums">02</p>
              <h3 className="mt-10 text-[19px] tracking-[-0.02em]">Target the job and scan</h3>
              <p className="mt-3 text-[13px] leading-[1.7] text-ink-3">
                Add the company and job description. Gemini 2.5 Flash runs the ATS scan and maps your
                experience against the language of the role.
              </p>
            </div>
            <div
              className="bg-surface p-6 sm:p-8"
              data-reveal="soft"
              style={{ "--reveal-delay": "160ms" } as CSSProperties}
            >
              <p className="text-[44px] font-semibold leading-none tracking-[-0.05em] text-cobalt tabular-nums">03</p>
              <h3 className="mt-10 text-[19px] tracking-[-0.02em]">Rewrite, tailor, apply</h3>
              <p className="mt-3 text-[13px] leading-[1.7] text-ink-3">
                Apply STAR rewrites, close the keyword gaps, and draft the cover letter in the same
                workspace. Then take the stronger version with you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="w-full">
        <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24">
          <div className="border-b border-rule pb-8" data-reveal="up">
            <p className="eyebrow">In their words</p>
            <h2 className="mt-4 max-w-2xl !text-[clamp(2rem,4.4vw,3.4rem)] !leading-[1.02] !tracking-[-0.045em]">
              What changed for three candidates.
            </h2>
          </div>

          <div className="grid gap-10 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <article className="border-t-2 border-cobalt pt-8" data-reveal="fade">
              <p className="text-[clamp(1.35rem,2.5vw,1.9rem)] leading-[1.35] tracking-[-0.025em] text-ink">
                “Resumind completely transformed how I present my engineering projects. The STAR
                rewriter turned my boring bullet points into quantifiable metrics. I landed 4 FAANG
                interviews within two weeks.”
              </p>
              <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-rule pt-5">
                <div>
                  <p className="text-[14px] font-semibold text-ink">Sarah Jenkins</p>
                  <p className="mt-0.5 text-[12px] text-ink-3">Senior Software Engineer at Stripe</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-ink-3">Score movement</p>
                  <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-cobalt">56 → 94</p>
                </div>
              </div>
            </article>

            <div
              className="divide-y divide-rule border-t border-rule"
              data-reveal="soft"
              style={{ "--reveal-delay": "100ms" } as CSSProperties}
            >
              <article className="py-7">
                <p className="text-[15px] leading-[1.7] text-ink-2">
                  “As a recruiter reviewing 300+ resumes a week, I can immediately spot a
                  Resumind-optimized resume. The single-column structure passes through Workday
                  effortlessly, and the STAR bullet points give me the exact metrics hiring managers
                  look for.”
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-ink">David Chen</p>
                    <p className="text-[11px] text-ink-3">Lead Technical Recruiter at TalentScale</p>
                  </div>
                  <span className="border border-rule bg-surface px-2 py-1 text-[10px] font-semibold text-ink-2">
                    Recruiter
                  </span>
                </div>
              </article>

              <article className="py-7">
                <p className="text-[15px] leading-[1.7] text-ink-2">
                  “The Keyword Gap Matcher is an absolute game changer. It showed me 6 crucial fintech
                  keywords I had omitted even though I had experience with them. Adding them boosted my
                  callback rate by 3x.”
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-ink">Elena Rostova</p>
                    <p className="text-[11px] text-ink-3">Product Manager at Series B Fintech</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-ink-3">Score movement</p>
                    <p className="text-[12px] font-semibold tabular-nums text-ink">61 → 91</p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ LEDGER */}
      <section id="faq" className="w-full border-y border-rule bg-surface">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start" data-reveal="up">
            <p className="eyebrow">Questions</p>
            <h2 className="mt-4 !text-[clamp(2rem,4.4vw,3.4rem)] !leading-[1.02] !tracking-[-0.045em]">
              Answered plainly.
            </h2>
            <p className="mt-5 max-w-sm text-[14px] leading-[1.7] text-ink-3">
              The short version: your files stay in your Puter account, the scoring is specific, and
              the tools work on real applications — not sample prompts.
            </p>
            <p className="mt-8 border-t border-rule pt-4 text-[12px] text-ink-3">
              Still deciding?{" "}
              <Link to="/upload" className="font-semibold text-cobalt hover:text-cobalt-deep">
                Run one resume through it.
              </Link>
            </p>
          </div>

          <div data-reveal="soft" style={{ "--reveal-delay": "80ms" } as CSSProperties}>
            <Accordion defaultOpen="faq-1" allowMultiple={false}>
              {faqs.map((faq) => (
                <AccordionItem key={faq.id} id={faq.id}>
                  <AccordionHeader itemId={faq.id}>
                    <span className="text-[15px] font-medium leading-snug text-ink sm:text-[16px]">
                      {faq.question}
                    </span>
                  </AccordionHeader>
                  <AccordionContent itemId={faq.id}>
                    <p className="max-w-2xl text-[13px] leading-[1.8] text-ink-3">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* COBALT ACTION TILE */}
      <section className="w-full">
        <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20">
          <div
            className="grid gap-10 bg-cobalt p-7 text-paper sm:p-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:p-16"
            data-reveal="scale"
          >
            <div>
              <p className="text-[12px] font-medium text-paper/65">The next application</p>
              <h2 className="mt-4 max-w-2xl !text-[clamp(2.2rem,4.8vw,3.8rem)] !leading-[0.98] !tracking-[-0.05em] !text-paper">
                Ready to 3x your interview callbacks?
              </h2>
              <p className="mt-5 max-w-xl text-[14px] leading-[1.7] text-paper/75">
                Join over 25,000 professionals who stopped guessing what the ATS wanted. Instant
                diagnostic feedback in under 15 seconds.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:items-stretch">
              <Link
                to="/upload"
                className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-paper bg-paper px-5 py-3 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                Analyze Your Resume Free — Takes 30 Seconds
              </Link>
              <Link
                to={isAuth ? "/dashboard" : "/auth?next=/dashboard"}
                className="group inline-flex items-center justify-center gap-2 rounded-[3px] border border-paper/35 px-5 py-3 text-[13px] font-semibold text-paper transition-colors hover:border-paper/60 hover:bg-paper/5"
              >
                Open My Dashboard
                <Icon
                  name="arrow-up-right"
                  size={15}
                  className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto w-full border-t border-rule">
        <div className="mx-auto max-w-[1240px] px-5 pt-12 sm:px-8 sm:pt-16">
          <div className="grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
            <div>
              <p className="text-[16px] font-bold tracking-[-0.045em] text-ink">RESUMIND</p>
              <p className="mt-3 max-w-xs text-[12px] leading-[1.7] text-ink-3">
                Intelligent career acceleration powered by Google Gemini 2.5 Flash on Puter Cloud.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-ink-2">Product</p>
              <ul className="mt-3 space-y-2 text-[12px] text-ink-3">
                <li><Link to="/upload" className="footer-link transition-colors hover:text-ink">ATS Checker</Link></li>
                <li><Link to="/workspace" className="footer-link transition-colors hover:text-ink">STAR Rewriter</Link></li>
                <li><Link to="/workspace" className="footer-link transition-colors hover:text-ink">Keyword Matcher</Link></li>
                <li><Link to="/dashboard" className="footer-link transition-colors hover:text-ink">Personal Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-ink-2">Platform</p>
              <ul className="mt-3 space-y-2 text-[12px] text-ink-3">
                <li>
                  <a href="https://puter.com" target="_blank" rel="noopener noreferrer" className="footer-link transition-colors hover:text-ink">
                    Puter.js Cloud
                  </a>
                </li>
                <li><a href="#how-it-works" className="footer-link transition-colors hover:text-ink">How It Works</a></li>
                <li><a href="#faq" className="footer-link transition-colors hover:text-ink">FAQ</a></li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-ink-2">Privacy</p>
              <ul className="mt-3 space-y-2 text-[12px] text-ink-3">
                <li>Client-side sandbox</li>
                <li>Zero tracking cookies</li>
                <li>Private KV isolation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Brand wordmark banner placed above copyright */}
        <div className="overflow-hidden border-t border-rule bg-paper" aria-hidden="true">
          <div className="mx-auto max-w-[1240px] px-5 pt-8 pb-4 sm:px-8">
            <p className="footer-mark whitespace-nowrap text-[clamp(4rem,15.5vw,13.5rem)] font-bold leading-[0.8] tracking-[-0.075em] text-ink select-none">
              RESUMIND
            </p>
          </div>
        </div>

        {/* Bottom copyright & attribution bar at the very bottom */}
        <div className="border-t border-rule bg-paper">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-[11px] text-ink-3 sm:px-8">
            <p>© 2026 Resumind. All rights reserved.</p>
            <p>Designed for the work of getting hired.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
