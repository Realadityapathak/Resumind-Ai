import { useState, useEffect } from "react";
import { Link } from "react-router";
import AuthGuard from "~/components/auth/AuthGuard";
import Navbar from "~/components/layout/Navbar";
import Sidebar from "~/components/layout/Sidebar";
import Icon, { type IconName } from "~/components/ui/Icon";
import { usePuterStore } from "~/services/puter/store";
import { safeJsonParse } from "~/utils/json";

export const meta = () => [
  { title: "AI Workspace | Resumind" },
  { name: "description", content: "Optimize, rewrite, and tailor your resumes with AI." },
];

const capabilities: { title: string; copy: string; icon: IconName; index: string }[] = [
  {
    index: "01",
    title: "STAR Bullet Rewriter",
    copy: "Transform passive duties into quantified impact with 3 tailored tones.",
    icon: "pen",
  },
  {
    index: "02",
    title: "Keyword Gap Matcher",
    copy: "Correlate your resume against job postings to identify critical missing skills.",
    icon: "target",
  },
  {
    index: "03",
    title: "Tailored Cover Letter",
    copy: "Generate high-converting personalized cover letters aligned with company mission.",
    icon: "file",
  },
  {
    index: "04",
    title: "24/7 AI Copilot",
    copy: "Converse with your dedicated career strategist powered by Gemini 2.5 Flash.",
    icon: "message",
  },
];

function WorkspaceContent() {
  const { kv } = usePuterStore();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchResumes = async () => {
      try {
        const rawList = (await kv.list("resume:*", true)) as KVItem[] | undefined;
        if (Array.isArray(rawList) && isMounted) {
          const parsed: Resume[] = [];
          for (const item of rawList) {
            let itemVal: unknown = item.value;
            if (
              typeof itemVal === "object" &&
              itemVal !== null &&
              "value" in itemVal &&
              !("id" in itemVal)
            ) {
              itemVal = itemVal.value;
            }
            const data =
              typeof itemVal === "object" && itemVal !== null
                ? (itemVal as Resume)
                : safeJsonParse<Resume | null>(itemVal, null);
            if (data && typeof data.id === "string") {
              if (typeof data.feedback === "string") {
                data.feedback = safeJsonParse(data.feedback, data.feedback);
              }
              parsed.push(data);
            }
          }
          setResumes(parsed);
        }
      } catch (err) {
        console.error("Failed to load resumes in workspace:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchResumes();
    return () => {
      isMounted = false;
    };
  }, [kv]);

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar variant="shell" />

        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {/* Page header */}
          <header className="flex flex-col gap-6 border-b border-rule pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">AI workspace</p>
              <h1 className="mt-4 !text-[clamp(2.1rem,4vw,3.2rem)] !leading-[1.02] !tracking-[-0.045em]">
                AI Optimization Studio
              </h1>
              <p className="mt-3 text-[14px] leading-[1.7] text-ink-3">
                Select an active resume to launch multi-dimensional scoring, STAR bullet rewrites,
                keyword gap analysis, and tailored cover letter generation.
              </p>
            </div>
            <Link to="/upload" className="primary-button w-fit !px-4 !py-2.5 text-[12px]">
              <Icon name="plus" size={14} />
              Upload New Resume
            </Link>
          </header>

          {/* Capability ledger */}
          <section className="mt-7 grid grid-cols-1 gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((capability) => (
              <div key={capability.title} className="flex flex-col bg-surface p-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-cobalt">
                    <Icon name={capability.icon} size={18} />
                  </span>
                  <span className="text-[11px] tabular-nums text-ink-4">{capability.index}</span>
                </div>
                <h2 className="mt-8 text-[15px] font-semibold leading-snug tracking-[-0.015em] text-ink">
                  {capability.title}
                </h2>
                <p className="mt-2 text-[12px] leading-[1.7] text-ink-3">{capability.copy}</p>
              </div>
            ))}
          </section>

          {/* Active resumes */}
          <section className="mt-8 border border-rule bg-surface">
            <div className="flex flex-col gap-3 border-b border-rule px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
                  Active Evaluated Resumes
                </h2>
                <p className="mt-1 text-[12px] text-ink-3">
                  Select any resume to open detailed analysis and AI tools.
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex w-fit items-center gap-1.5 text-[12px] font-semibold text-cobalt transition-colors hover:text-cobalt-deep"
              >
                View All on Dashboard
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-ink-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-rule border-t-cobalt" />
                <p className="text-[12px] font-medium">Loading workspace files…</p>
              </div>
            ) : resumes.length === 0 ? (
              <div className="px-6 py-16">
                <div className="mx-auto flex max-w-md flex-col items-start">
                  <span className="flex h-10 w-10 items-center justify-center border border-rule bg-paper text-cobalt">
                    <Icon name="file" size={18} />
                  </span>
                  <h3 className="mt-6 text-[17px] font-semibold text-ink">No Resumes in Workspace</h3>
                  <p className="mt-2 text-[12px] leading-[1.75] text-ink-3">
                    Upload your first PDF resume to begin using the AI optimization studio.
                  </p>
                  <Link to="/upload" className="primary-button mt-6 !px-4 !py-2.5 text-[12px]">
                    Upload Resume
                    <Icon name="arrow-right" size={14} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-rule">
                {resumes.map((resume) => {
                  const score = resume.feedback?.overallScore ?? 0;
                  return (
                    <Link
                      key={resume.id}
                      to={`/resume/${resume.id}`}
                      state={{ initialResume: resume }}
                      className="group grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-white sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center sm:gap-6"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-ink-4">
                          {resume.createdAt ? new Date(resume.createdAt).toLocaleDateString() : "Saved"}
                        </p>
                        <h3 className="mt-1 truncate text-[14px] font-semibold text-ink transition-colors group-hover:text-cobalt">
                          {resume.jobTitle || resume.fileName || "Uploaded Resume"}
                        </h3>
                      </div>

                      <p className="truncate text-[12px] text-ink-3">
                        {resume.companyName || "General Application"}
                      </p>

                      <span
                        className={`w-fit border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                          score > 70
                            ? "border-green-200 bg-green-50 text-green-700"
                            : score >= 50
                            ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {score}/100
                      </span>

                      <span className="inline-flex items-center justify-between gap-2 text-[12px] font-semibold text-cobalt sm:justify-end">
                        Launch Studio
                        <Icon
                          name="arrow-right"
                          size={14}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Footnote */}
          <p className="mt-5 text-[11px] leading-relaxed text-ink-4">
            Evaluations, page previews, and scores remain in your own Puter Cloud account.
          </p>
        </main>
      </div>
    </div>
  );
}

export default function Workspace() {
  return (
    <AuthGuard>
      <WorkspaceContent />
    </AuthGuard>
  );
}
