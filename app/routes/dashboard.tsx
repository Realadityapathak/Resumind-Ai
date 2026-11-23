import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import AuthGuard from "~/components/auth/AuthGuard";
import Navbar from "~/components/layout/Navbar";
import Sidebar from "~/components/layout/Sidebar";
import ScoreBadge from "~/components/ui/ScoreBadge";
import Icon from "~/components/ui/Icon";
import { usePuterStore } from "~/services/puter/store";
import { safeJsonParse } from "~/utils/json";

export const meta = () => [
  { title: "Personal Dashboard | Resumind" },
  { name: "description", content: "Manage, filter, and track all your AI resume evaluations." },
];

function DashboardContent() {
  const { kv, fs } = usePuterStore();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<"all" | "strong" | "moderate" | "weak">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "score_desc" | "score_asc" | "company_asc">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Deletion modal state
  const [resumeToDelete, setResumeToDelete] = useState<Resume | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load resumes from Puter KV
  useEffect(() => {
    let isMounted = true;
    const fetchResumes = async () => {
      setLoadingResumes(true);
      try {
        const rawItems = (await kv.list("resume:*", true)) as KVItem[] | undefined;
        if (!isMounted) return;

        if (Array.isArray(rawItems)) {
          const parsed: Resume[] = [];
          for (const item of rawItems) {
            let itemVal: unknown = item.value;
            if (
              typeof itemVal === "object" &&
              itemVal !== null &&
              "value" in itemVal &&
              !("id" in itemVal)
            ) {
              itemVal = itemVal.value;
            }
            const data = safeJsonParse<Resume | null>(itemVal, null);
            if (data && data.id && data.feedback && typeof data.feedback.overallScore === "number") {
              parsed.push(data);
            }
          }
          setResumes(parsed);
        } else {
          setResumes([]);
        }
      } catch (err) {
        console.error("Failed to load resumes from Puter KV:", err);
        if (isMounted) setResumes([]);
      } finally {
        if (isMounted) setLoadingResumes(false);
      }
    };

    fetchResumes();
    return () => {
      isMounted = false;
    };
  }, [kv]);

  // KPI Metrics Calculations
  const { totalEvaluated, averageScore, topScore, actionItemsCount } = useMemo(() => {
    const total = resumes.length;
    const avg = total > 0
      ? Math.round(resumes.reduce((sum, r) => sum + r.feedback.overallScore, 0) / total)
      : 0;
    const top = total > 0
      ? Math.max(...resumes.map((r) => r.feedback.overallScore))
      : 0;
    const actionItems = resumes.reduce((acc, resume) => {
      const improveTips = resume.feedback?.ATS?.tips?.filter((tip) => tip?.type === "improve") || [];
      return acc + improveTips.length;
    }, 0);
    return {
      totalEvaluated: total,
      averageScore: avg,
      topScore: top,
      actionItemsCount: actionItems,
    };
  }, [resumes]);

  // Search, Filter & Sort Processing
  const filteredResumes = useMemo(() => {
    return resumes
      .filter((resume) => {
        // 1. Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const companyMatch = (resume.companyName || "").toLowerCase().includes(q);
          const roleMatch = (resume.jobTitle || "").toLowerCase().includes(q);
          const tipsMatch =
            resume.feedback?.ATS?.tips?.some((tip) => tip?.tip && tip.tip.toLowerCase().includes(q)) || false;

          if (!companyMatch && !roleMatch && !tipsMatch) {
            return false;
          }
        }

        // 2. Score Filter
        const score = resume.feedback.overallScore;
        if (scoreFilter === "strong" && score <= 70) return false;
        if (scoreFilter === "moderate" && (score < 50 || score > 70)) return false;
        if (scoreFilter === "weak" && score >= 50) return false;

        return true;
      })
      .sort((a, b) => {
        // 3. Multi-Field Sorting
        if (sortBy === "newest") {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        }
        if (sortBy === "oldest") {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        }
        if (sortBy === "score_desc") {
          return b.feedback.overallScore - a.feedback.overallScore;
        }
        if (sortBy === "score_asc") {
          return a.feedback.overallScore - b.feedback.overallScore;
        }
        if (sortBy === "company_asc") {
          return (a.companyName || "Untitled").localeCompare(b.companyName || "Untitled");
        }
        return 0;
      });
  }, [resumes, searchQuery, scoreFilter, sortBy]);

  // File-first deletion protocol: the KV record is only removed after every file is gone.
  const handleConfirmDelete = async () => {
    if (!resumeToDelete) return;
    setIsDeleting(true);

    try {
      // Step 1: Collect every unique file path (PDF, all page images, legacy primary image)
      const filePaths = Array.from(
        new Set(
          [
            resumeToDelete.resumePath,
            ...(Array.isArray(resumeToDelete.imagePaths) ? resumeToDelete.imagePaths : []),
            resumeToDelete.imagePath,
          ].filter((path): path is string => Boolean(path))
        )
      );

      // Step 2: Delete cloud files first. If any cleanup fails, keep the KV record for retry unless the file is already gone.
      const results = await Promise.allSettled(filePaths.map((path) => fs.delete(path)));
      const failedPaths = results.flatMap((result, index) => {
        if (result.status === "rejected") {
          const reason = String(result.reason?.message || result.reason || "").toLowerCase();
          const isAlreadyGone =
            reason.includes("not found") ||
            reason.includes("no such") ||
            reason.includes("does not exist") ||
            reason.includes("404") ||
            reason.includes("enoent");
          if (!isAlreadyGone) {
            return [filePaths[index]];
          }
        }
        return [];
      });
      if (failedPaths.length > 0) {
        failedPaths.forEach((path) => console.warn(`FS delete failed for ${path}`));
        throw new Error("Resume files could not be removed from Puter FS.");
      }

      // Step 3: Only now remove the Puter KV record.
      const key = `resume:${resumeToDelete.id}`;
      const deleted = await kv.delete(key);
      if (deleted === undefined) {
        throw new Error("Puter KV is unavailable.");
      }
      if (!deleted) {
        // A false result can mean the key was already removed by another session.
        // Verify the end state: absent (null) is success, still-present is a failed delete.
        const remaining = await kv.get(key);
        if (remaining !== null) {
          throw new Error("Puter KV rejected the deletion.");
        }
      }

      // Step 4: Atomic local state update
      if (isMountedRef.current) {
        setResumes((prev) => prev.filter((r) => r.id !== resumeToDelete.id));
        setToastMessage({
          text: `Evaluation for "${resumeToDelete.companyName || resumeToDelete.jobTitle || 'Resume'}" deleted successfully.`,
          type: "success",
        });
        setResumeToDelete(null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      const message = err instanceof Error ? err.message : "";
      const failureDetail = message.includes("files could not be removed")
        ? "its files could not be removed"
        : "its cloud record could not be removed";
      if (isMountedRef.current) {
        setToastMessage({
          text: `Could not delete the evaluation because ${failureDetail}. The record was kept so you can retry.`,
          type: "error",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsDeleting(false);
      }
    }
  };

  // PDF Download Action
  const handleDownloadPdf = async (resume: Resume) => {
    let objectUrl = "";
    try {
      const blob = await fs.read(resume.resumePath);
      if (!blob) throw new Error("File not found in Puter FS");

      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      const rawName = resume.fileName || `${resume.companyName || "resume"}.pdf`;
      link.download = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (isMountedRef.current) {
        setToastMessage({ text: "Resume downloaded successfully.", type: "success" });
      }
    } catch (err) {
      console.error("Download failed:", err);
      if (isMountedRef.current) {
        setToastMessage({ text: "Could not download resume PDF from cloud storage.", type: "error" });
      }
    } finally {
      if (objectUrl) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
            // Ignore revoke errors
          }
        }, 1000);
      }
    }
  };

  const scoreChipClass = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-[2px] border px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
      active
        ? "border-ink bg-ink text-paper"
        : "border-rule bg-paper text-ink-2 hover:border-rule-strong hover:text-ink"
    }`;

  const tierDot = (tone: "all" | "strong" | "moderate" | "weak") => {
    const color =
      tone === "strong"
        ? "bg-forest"
        : tone === "moderate"
        ? "bg-ochre"
        : tone === "weak"
        ? "bg-rust"
        : "bg-ink-3";
    return <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden="true" />;
  };

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {/* Toast Notification */}
          {toastMessage && (
            <div
              role="status"
              className={`mb-6 flex items-start justify-between gap-4 border-l-2 px-4 py-3 text-[13px] animate-fadeIn ${
                toastMessage.type === "success"
                  ? "border-forest bg-green-50 text-green-700"
                  : "border-rust bg-red-50 text-red-700"
              }`}
            >
              <span className="flex items-start gap-2.5">
                <Icon
                  name={toastMessage.type === "success" ? "check" : "alert"}
                  size={15}
                  className="mt-0.5 shrink-0"
                />
                {toastMessage.text}
              </span>
              <button
                onClick={() => setToastMessage(null)}
                aria-label="Dismiss notification"
                className="shrink-0 p-1 text-ink-3 transition-colors hover:text-ink cursor-pointer"
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          )}

          {/* Page header */}
          <header className="flex flex-col gap-6 border-b border-rule pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">Analytics &amp; history</p>
              <h1 className="mt-4 !text-[clamp(2.1rem,4vw,3.2rem)] !leading-[1.02] !tracking-[-0.045em]">
                Resume Performance Dashboard
              </h1>
              <p className="mt-3 text-[14px] leading-[1.7] text-ink-3">
                Monitor ATS scores, track targeted applications, and refine the bullet points that
                matter most.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-[11px] text-ink-3">
                <span className="h-1.5 w-1.5 rounded-full bg-forest" />
                Puter Cloud synced
              </span>
              <Link
                to="/upload"
                className="primary-button !px-4 !py-2.5 text-[12px]"
              >
                <Icon name="plus" size={14} />
                Upload New Resume
              </Link>
            </div>
          </header>

          {/* KPI ledger */}
          <section
            aria-label="Evaluation metrics"
            className="mt-7 grid grid-cols-2 gap-px border border-rule bg-rule lg:grid-cols-4"
          >
            <div className="bg-surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="ledger-label">Total Evaluated</p>
                <Icon name="files" size={15} className="text-ink-4" />
              </div>
              <p
                className="mt-5 text-[30px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-ink sm:text-[36px]"
                data-testid="kpi-total-resumes"
              >
                {totalEvaluated}
              </p>
              <p className="mt-2 text-[11px] leading-snug text-ink-3">Stored in your Puter Cloud</p>
            </div>

            <div className="bg-surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="ledger-label">Average ATS Score</p>
                <Icon name="chart" size={15} className="text-ink-4" />
              </div>
              <div className="mt-5 flex items-end gap-1.5">
                <p
                  className="text-[30px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-ink sm:text-[36px]"
                  data-testid="kpi-average-score"
                >
                  {averageScore}
                </p>
                <span className="pb-0.5 text-[12px] font-medium text-ink-4">/ 100</span>
              </div>
              <div className="mt-2">
                <ScoreBadge score={averageScore} />
              </div>
            </div>

            <div className="bg-surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="ledger-label">Best Match / Top Score</p>
                <Icon name="target" size={15} className="text-ink-4" />
              </div>
              <div className="mt-5 flex items-end gap-1.5">
                <p
                  className="text-[30px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-cobalt sm:text-[36px]"
                  data-testid="kpi-top-score"
                >
                  {topScore}
                </p>
                <span className="pb-0.5 text-[12px] font-medium text-ink-4">/ 100</span>
              </div>
              <p className="mt-2 truncate text-[11px] leading-snug text-ink-3">
                {totalEvaluated > 0 ? "Highest ATS match" : "No evaluations yet"}
              </p>
            </div>

            <div className="bg-surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="ledger-label">High Priority Actions</p>
                <Icon name="alert" size={15} className="text-ink-4" />
              </div>
              <p
                className="mt-5 text-[30px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-ochre sm:text-[36px]"
                data-testid="kpi-action-items"
              >
                {actionItemsCount}
              </p>
              <p className="mt-2 text-[11px] leading-snug text-ink-3">ATS improvement recommendations</p>
            </div>
          </section>

          {/* Toolbar */}
          <section aria-label="Filter and sort evaluations" className="mt-6 border border-rule bg-surface">
            <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Icon
                  name="search"
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by company, role, or keyword..."
                  aria-label="Search evaluations"
                  className="w-full !border-rule !bg-paper py-2.5 pl-9 pr-3.5 text-[13px]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-select" className="whitespace-nowrap text-[11px] font-medium text-ink-3">
                    Sort by:
                  </label>
                  <select
                    id="sort-select"
                    aria-label="Sort by"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="w-auto !border-rule !bg-paper px-2.5 py-2 text-[12px] font-medium"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="score_desc">Score: High to Low</option>
                    <option value="score_asc">Score: Low to High</option>
                    <option value="company_asc">Company (A-Z)</option>
                  </select>
                </div>

                <div className="flex items-center gap-0.5 border border-rule bg-paper p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                    aria-pressed={viewMode === "grid"}
                    className={`flex h-8 w-9 items-center justify-center rounded-[1px] transition-colors cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-ink text-paper"
                        : "text-ink-3 hover:text-ink"
                    }`}
                  >
                    <Icon name="grid" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    aria-label="Table view"
                    aria-pressed={viewMode === "table"}
                    className={`flex h-8 w-9 items-center justify-center rounded-[1px] transition-colors cursor-pointer ${
                      viewMode === "table"
                        ? "bg-ink text-paper"
                        : "text-ink-3 hover:text-ink"
                    }`}
                  >
                    <Icon name="table" size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-rule px-4 py-3">
              <span className="mr-1 text-[11px] font-medium text-ink-3">Score tiers</span>
              <button type="button" onClick={() => setScoreFilter("all")} className={scoreChipClass(scoreFilter === "all")}>
                {tierDot("all")}
                All Resumes ({resumes.length})
              </button>
              <button type="button" onClick={() => setScoreFilter("strong")} className={scoreChipClass(scoreFilter === "strong")}>
                {tierDot("strong")}
                Strong (&gt;70)
              </button>
              <button type="button" onClick={() => setScoreFilter("moderate")} className={scoreChipClass(scoreFilter === "moderate")}>
                {tierDot("moderate")}
                Good Start (50–70)
              </button>
              <button type="button" onClick={() => setScoreFilter("weak")} className={scoreChipClass(scoreFilter === "weak")}>
                {tierDot("weak")}
                Needs Work (&lt;50)
              </button>
            </div>
          </section>

          {/* MAIN CONTENT AREA */}
          <section aria-label="Evaluations" className="mt-6">
            {loadingResumes ? (
              <div className="flex flex-col items-center justify-center gap-4 border border-rule bg-surface px-6 py-20 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-rule border-t-cobalt" />
                <p className="text-[13px] font-medium text-ink-2">Loading your evaluations from Puter KV…</p>
              </div>
            ) : totalEvaluated === 0 ? (
              /* EMPTY STATE */
              <div className="border border-rule bg-surface px-6 py-16 sm:py-24">
                <div className="mx-auto flex max-w-md flex-col items-start">
                  <span className="flex h-11 w-11 items-center justify-center border border-rule bg-paper text-cobalt">
                    <Icon name="files" size={19} />
                  </span>
                  <h2 className="mt-8 text-[22px] font-semibold tracking-[-0.03em] text-ink">
                    No Resumes Evaluated Yet
                  </h2>
                  <p className="mt-3 text-[13px] leading-[1.75] text-ink-3">
                    Upload your first resume in PDF format to receive instant ATS diagnostics, STAR
                    rewrites, and keyword analysis.
                  </p>
                  <Link to="/upload" className="primary-button mt-7 text-[13px]">
                    Upload Resume
                    <Icon name="arrow-right" size={15} />
                  </Link>
                </div>
              </div>
            ) : filteredResumes.length === 0 ? (
              /* NO FILTER RESULTS */
              <div className="border border-rule bg-surface px-6 py-16 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center border border-rule bg-paper text-ink-3">
                  <Icon name="search" size={17} />
                </span>
                <h3 className="mt-6 text-[17px] font-semibold text-ink">
                  No evaluations matched your search criteria
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-ink-3">
                  Try clearing your search term or adjusting the score tier filter chips.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setScoreFilter("all");
                  }}
                  className="mt-5 text-[12px] font-semibold text-cobalt hover:text-cobalt-deep cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW */
              <div
                className="grid grid-cols-1 gap-px border border-rule bg-rule sm:grid-cols-2 xl:grid-cols-3"
                data-testid="resumes-grid-view"
              >
                {filteredResumes.map((resume) => {
                  const score = resume.feedback.overallScore;
                  return (
                    <article
                      key={resume.id}
                      className="group flex flex-col justify-between bg-surface p-5 transition-colors hover:bg-white"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium text-ink-4">
                              {resume.createdAt ? new Date(resume.createdAt).toLocaleDateString() : "Saved Evaluation"}
                            </p>
                            <h3
                              className="mt-2 truncate text-[17px] font-semibold tracking-[-0.02em] text-ink"
                              data-testid="resume-item-title"
                            >
                              {resume.companyName || resume.jobTitle || "Uploaded Resume"}
                            </h3>
                            {resume.jobTitle && (
                              <p className="mt-0.5 truncate text-[12px] text-ink-3">{resume.jobTitle}</p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 border px-2 py-1 text-[12px] font-semibold tabular-nums ${
                              score > 70
                                ? "border-green-200 bg-green-50 text-green-700"
                                : score >= 50
                                ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                                : "border-red-200 bg-red-50 text-red-700"
                            }`}
                          >
                            {score}/100
                          </span>
                        </div>

                        <div className="mt-6 border-l border-rule pl-3">
                          <p className="text-[10px] font-medium text-ink-4">ATS diagnostic</p>
                          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-2">
                            {resume.feedback.ATS?.tips?.[0]?.tip || "Evaluation completed successfully."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between gap-2 border-t border-rule pt-3">
                        <Link
                          to={`/resume/${resume.id}`}
                          state={{ initialResume: resume }}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-cobalt transition-colors hover:text-cobalt-deep"
                        >
                          Review
                          <Icon name="arrow-right" size={14} />
                        </Link>

                        <div className="flex items-center gap-1">
                          {resume.fileName && (
                            <span className="mr-2 hidden max-w-[120px] truncate text-[10px] text-ink-4 sm:block">
                              {resume.fileName}
                            </span>
                          )}
                          {resume.resumePath && (
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(resume)}
                              data-testid={`download-btn-${resume.id}`}
                              className="flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center border border-transparent text-ink-4 transition-colors hover:border-rule hover:text-ink"
                              title="Download PDF"
                              aria-label={`Download PDF for ${resume.companyName || resume.id}`}
                            >
                              <Icon name="download" size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setResumeToDelete(resume)}
                            data-testid={`delete-btn-${resume.id}`}
                            className="flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center border border-transparent text-ink-4 transition-colors hover:border-rule hover:text-rust"
                            title="Delete Evaluation"
                            aria-label={`Delete ${resume.companyName || resume.id}`}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="border border-rule bg-surface" data-testid="resumes-table-view">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[12px] sm:text-[13px]">
                    <thead>
                      <tr className="border-b border-rule bg-surface-2">
                        <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3 sm:px-5">
                          Company / Application
                        </th>
                        <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3 sm:px-5">
                          Target Role
                        </th>
                        <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3 sm:px-5">
                          ATS Score
                        </th>
                        <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3 sm:px-5">
                          Date Evaluated
                        </th>
                        <th className="px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3 sm:px-5">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule">
                      {filteredResumes.map((resume) => {
                        const score = resume.feedback.overallScore;
                        return (
                          <tr key={resume.id} className="transition-colors hover:bg-white">
                            <td
                              className="px-4 py-4 font-semibold text-ink sm:px-5"
                              data-testid="resume-item-title"
                            >
                              <Link
                                to={`/resume/${resume.id}`}
                                state={{ initialResume: resume }}
                                className="transition-colors hover:text-cobalt"
                              >
                                {resume.companyName || resume.jobTitle || "Uploaded Resume"}
                              </Link>
                            </td>
                            <td className="px-4 py-4 text-ink-2 sm:px-5">{resume.jobTitle || "—"}</td>
                            <td className="px-4 py-4 sm:px-5">
                              <span
                                className={`inline-block border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                                  score > 70
                                    ? "border-green-200 bg-green-50 text-green-700"
                                    : score >= 50
                                    ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                                    : "border-red-200 bg-red-50 text-red-700"
                                }`}
                              >
                                {score}/100
                              </span>
                            </td>
                            <td className="px-4 py-4 text-[11px] text-ink-3 sm:px-5">
                              {resume.createdAt ? new Date(resume.createdAt).toLocaleDateString() : "Saved"}
                            </td>
                            <td className="px-4 py-4 text-right sm:px-5">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  to={`/resume/${resume.id}`}
                                  state={{ initialResume: resume }}
                                  className="inline-flex items-center border border-rule bg-paper px-2.5 py-1.5 text-[11px] font-semibold text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
                                >
                                  View
                                </Link>
                                {resume.resumePath && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPdf(resume)}
                                    data-testid={`download-btn-${resume.id}`}
                                    className="flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center border border-transparent text-ink-4 transition-colors hover:border-rule hover:text-ink"
                                    title="Download PDF"
                                    aria-label={`Download PDF for ${resume.companyName || resume.id}`}
                                  >
                                    <Icon name="download" size={15} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setResumeToDelete(resume)}
                                  data-testid={`delete-btn-${resume.id}`}
                                  className="flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center border border-transparent text-ink-4 transition-colors hover:border-rule hover:text-rust"
                                  title="Delete Evaluation"
                                  aria-label={`Delete ${resume.companyName || resume.id}`}
                                >
                                  <Icon name="trash" size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* DELETE CONFIRMATION MODAL */}
          {resumeToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
              <div
                className="backdrop-in fixed inset-0 bg-ink/40 transition-opacity"
                onClick={() => !isDeleting && setResumeToDelete(null)}
              />
              <div className="relative z-10 w-full max-w-md animate-fadeIn border border-rule bg-paper p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center border border-red-200 bg-red-50 text-rust">
                    <Icon name="trash" size={16} />
                  </span>
                  <span className="text-[10px] font-medium text-ink-4">Permanent action</span>
                </div>
                <h3 className="mt-6 text-[19px] font-semibold leading-snug tracking-[-0.02em] text-ink">
                  Are you sure you want to delete this evaluation?
                </h3>
                <p className="mt-3 text-[12px] leading-[1.75] text-ink-3">
                  This will permanently delete the evaluation for{" "}
                  <span className="font-semibold text-ink">
                    "{resumeToDelete.companyName || resumeToDelete.jobTitle || 'Resume'}"
                  </span>{" "}
                  from Puter KV and remove all associated PDF and thumbnail files from cloud storage.
                </p>
                <div className="mt-7 flex items-center justify-end gap-2 border-t border-rule pt-5">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setResumeToDelete(null)}
                    className="secondary-button !px-4 !py-2.5 text-[12px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-[3px] border border-rust bg-rust px-4 py-2.5 text-[12px] font-semibold text-paper transition-colors hover:bg-red-700 disabled:opacity-60"
                  >
                    {isDeleting && (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper border-t-transparent" />
                    )}
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
