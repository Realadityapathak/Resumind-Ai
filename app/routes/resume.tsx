import { Link, useParams, useSearchParams, useLocation } from "react-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import AuthGuard from "~/components/auth/AuthGuard";
import Icon from "~/components/ui/Icon";
import { usePuterStore } from "~/services/puter/store";
import { safeJsonParse } from "~/utils/json";
import ScoreBadge from "~/components/ui/ScoreBadge";
import { exportEvaluationReport } from "~/utils/exportReport";
import PdfPreviewer from "~/features/resume-workspace/PdfPreviewer";
import WorkspaceTabs from "~/features/resume-workspace/WorkspaceTabs";
import OverviewTab from "~/features/resume-workspace/OverviewTab";
import DetailsTab from "~/features/resume-workspace/DetailsTab";
import KeywordGapTab from "~/features/keyword-gap/KeywordGapTab";
import StarRewriterTab from "~/features/star-rewriter/StarRewriterTab";
import CoverLetterTab from "~/features/cover-letter/CoverLetterTab";
import InterviewPrepTab from "~/features/interview-prep/InterviewPrepTab";
import AICopilotTab from "~/features/copilot/AICopilotTab";

export const meta = () => [
    { title: "Resumind | Workspace & Analysis" },
    { name: "description", content: "Interactive resume workspace with AI evaluation, keyword gap analysis, and STAR rewriter." },
];

const VALID_TABS: WorkspaceTabId[] = [
    "overview",
    "details",
    "keywords",
    "star",
    "cover-letter",
    "interview-prep",
    "copilot",
];

const ResumeWorkspaceContent = () => {
    const { fs, kv } = usePuterStore();
    const { id } = useParams<{ id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    // Zero-latency state injection from upload/dashboard/workspace navigation
    const locationState = location.state as { initialResume?: Resume } | null;
    const initialResume =
        locationState?.initialResume && locationState.initialResume.id === id
            ? locationState.initialResume
            : null;

    const [resume, setResume] = useState<Resume | null>(initialResume);
    const [isLoading, setIsLoading] = useState<boolean>(!initialResume);
    const [notFound, setNotFound] = useState<boolean>(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Object URLs for PDF and Page Images
    const [resumeUrl, setResumeUrl] = useState<string>("");
    const [primaryImageUrl, setPrimaryImageUrl] = useState<string>("");
    const [allImageUrls, setAllImageUrls] = useState<string[]>([]);

    // Compute active tab from URL search param
    const tabParam = searchParams.get("tab") as WorkspaceTabId;
    const activeTab: WorkspaceTabId = VALID_TABS.includes(tabParam) ? tabParam : "overview";

    const handleTabChange = useCallback(
        (newTab: WorkspaceTabId) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("tab", newTab);
                    return next;
                },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    const weaknesses = useMemo(() => {
        if (!resume?.feedback) return [];
        return [
            ...(resume.feedback.ATS?.tips?.filter((t) => t?.type === "improve").map((t) => t?.tip || "").filter(Boolean) || []),
            ...(resume.feedback.toneAndStyle?.tips?.filter((t) => t?.type === "improve").map((t) => t?.tip || "").filter(Boolean) || []),
            ...(resume.feedback.content?.tips?.filter((t) => t?.type === "improve").map((t) => t?.tip || "").filter(Boolean) || []),
            ...(resume.feedback.structure?.tips?.filter((t) => t?.type === "improve").map((t) => t?.tip || "").filter(Boolean) || []),
            ...(resume.feedback.skills?.tips?.filter((t) => t?.type === "improve").map((t) => t?.tip || "").filter(Boolean) || []),
        ];
    }, [resume?.feedback]);

    // Puter KV & FS Load Lifecycle with Object URL Revocation
    useEffect(() => {
        let isMounted = true;
        const createdUrls: string[] = [];

        const loadResumeData = async () => {
            if (!id) return;
            try {
                if (!initialResume) {
                    setIsLoading(true);
                }
                setNotFound(false);

                // Helper to safely unwrap a Resume object from raw KV payload or envelope
                const unwrapResume = (rawPayload: unknown): Resume | null => {
                    if (!rawPayload) return null;
                    let payload: unknown = rawPayload;
                    if (
                        typeof payload === "object" &&
                        payload !== null &&
                        "value" in payload &&
                        !("id" in payload)
                    ) {
                        payload = (payload as Record<string, unknown>).value;
                    }

                    const parsed: Resume | null =
                        typeof payload === "object" && payload !== null
                            ? (payload as Resume)
                            : safeJsonParse<Resume | null>(payload, null);

                    if (!parsed || typeof parsed !== "object" || typeof parsed.id !== "string" || !parsed.id.trim()) {
                        return null;
                    }

                    if (parsed && typeof parsed.feedback === "string") {
                        parsed.feedback = safeJsonParse(parsed.feedback, parsed.feedback);
                    }
                    return parsed;
                };

                let data: Resume | null = initialResume;

                if (!data) {
                    // Attempt 1: Direct key lookup
                    let raw = await kv.get(`resume:${id}`);
                    data = unwrapResume(raw);

                    // Attempt 2: Cloud replication retry (150ms)
                    if (!data && isMounted) {
                        await new Promise((resolve) => setTimeout(resolve, 150));
                        if (isMounted) {
                            raw = await kv.get(`resume:${id}`);
                            data = unwrapResume(raw);
                        }
                    }

                    // Attempt 3: Resilient fallback to kv.list scanning
                    if (!data && isMounted) {
                        try {
                            const listItems = (await kv.list("resume:*", true)) as KVItem[] | undefined;
                            if (Array.isArray(listItems) && isMounted) {
                                for (const item of listItems) {
                                    const candidate = unwrapResume(item.value);
                                    if (candidate && candidate.id === id) {
                                        data = candidate;
                                        break;
                                    }
                                }
                            }
                        } catch (listErr) {
                            console.warn("KV list fallback error:", listErr);
                        }
                    }
                }

                if (!data || !isMounted) {
                    if (isMounted) setNotFound(true);
                    return;
                }

                setResume(data);

                // Load original PDF blob for preview and download
                if (data.resumePath) {
                    try {
                        const resumeBlob = await fs.read(data.resumePath);
                        if (resumeBlob && isMounted) {
                            const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
                            const url = URL.createObjectURL(pdfBlob);
                            createdUrls.push(url);
                            setResumeUrl(url);
                        }
                    } catch (pdfErr) {
                        console.warn("Could not load original PDF blob:", pdfErr);
                    }
                }

                // Load multi-page images or primary image
                const pathsToLoad = Array.isArray(data.imagePaths) && data.imagePaths.length > 0
                    ? data.imagePaths
                    : (data.imagePath ? [data.imagePath] : []);

                const loadedUrls: string[] = [];
                for (const path of pathsToLoad) {
                    try {
                        const imgBlob = await fs.read(path);
                        if (imgBlob && isMounted) {
                            const url = URL.createObjectURL(imgBlob);
                            createdUrls.push(url);
                            loadedUrls.push(url);
                        }
                    } catch (imgErr) {
                        console.warn(`Could not load image at path: ${path}`, imgErr);
                    }
                }

                if (isMounted) {
                    setAllImageUrls(loadedUrls);
                    setPrimaryImageUrl(loadedUrls[0] || "");
                }
            } catch (err) {
                console.error("Failed to load resume workspace data:", err);
                if (isMounted && !initialResume) setNotFound(true);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadResumeData();

        return () => {
            isMounted = false;
            createdUrls.forEach((url) => {
                try {
                    URL.revokeObjectURL(url);
                } catch {
                    // Ignore revoke errors
                }
            });
        };
    }, [id, kv, fs, initialResume]);

    const resumeRef = useRef<Resume | null>(resume);
    resumeRef.current = resume;

    // Centralized KV persistence: failures propagate to the child tab and surface an unsaved state.
    const persistResume = useCallback(
        async (updatedResume: Resume) => {
            try {
                const saved = await kv.set(
                    `resume:${updatedResume.id}`,
                    JSON.stringify(updatedResume)
                );
                if (!saved) {
                    throw new Error("Puter KV rejected the write.");
                }
                if (isMountedRef.current) {
                    setResume(updatedResume);
                    setSaveError(null);
                }
            } catch (err) {
                console.error("Failed to persist resume changes to Puter KV:", err);
                if (isMountedRef.current) {
                    setSaveError(
                        "Your latest changes are only in this tab. Saving to Puter Cloud failed, so they may be lost if you reload."
                    );
                }
                throw err;
            }
        },
        [kv]
    );

    const handleSaveKeywordAnalysis = useCallback(async (newAnalysis: KeywordAnalysis) => {
        const current = resumeRef.current;
        if (!current) return;
        await persistResume({
            ...current,
            keywordAnalysis: newAnalysis,
            updatedAt: new Date().toISOString(),
        });
    }, [persistResume]);

    const handleSaveStarRewrite = useCallback(async (newRewrite: StarRewriteResult) => {
        const current = resumeRef.current;
        if (!current) return;
        const existing = current.savedStarRewrites || [];
        const filtered = existing.filter((r: StarRewriteResult) => r.id !== newRewrite.id);
        await persistResume({
            ...current,
            savedStarRewrites: [newRewrite, ...filtered],
            updatedAt: new Date().toISOString(),
        });
    }, [persistResume]);

    const handleDeleteStarRewrite = useCallback(async (rewriteId: string) => {
        const current = resumeRef.current;
        if (!current) return;
        const existing = current.savedStarRewrites || [];
        await persistResume({
            ...current,
            savedStarRewrites: existing.filter((r: StarRewriteResult) => r.id !== rewriteId),
            updatedAt: new Date().toISOString(),
        });
    }, [persistResume]);

    const handleSaveCoverLetter = useCallback(async (newLetter: CoverLetter) => {
        const current = resumeRef.current;
        if (!current) return;
        const existing = current.coverLetters || [];
        const filtered = existing.filter((l: CoverLetter) => l.id !== newLetter.id);
        await persistResume({
            ...current,
            coverLetters: [newLetter, ...filtered],
            updatedAt: new Date().toISOString(),
        });
    }, [persistResume]);

    const handleDeleteCoverLetter = useCallback(async (letterId: string) => {
        const current = resumeRef.current;
        if (!current) return;
        const existing = current.coverLetters || [];
        await persistResume({
            ...current,
            coverLetters: existing.filter((l: CoverLetter) => l.id !== letterId),
            updatedAt: new Date().toISOString(),
        });
    }, [persistResume]);

    const handleSaveInterviewPrep = useCallback(async (newPrep: InterviewPrepSection) => {
        const current = resumeRef.current;
        if (!current) return;
        await persistResume({
            ...current,
            interviewPrep: newPrep,
            updatedAt: new Date().toISOString(),
        });
    }, [persistResume]);

    const handleSaveCopilotChat = useCallback(async (messages: CopilotMessage[]) => {
        const current = resumeRef.current;
        if (!current) return;
        await persistResume({
            ...current,
            copilotChat: messages,
            updatedAt: new Date().toISOString(),
        });
    }, [persistResume]);

    const handleExportReport = useCallback(() => {
        if (!resume) return;
        exportEvaluationReport(resume);
    }, [resume]);

    if (notFound) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-16">
                <div className="w-full max-w-md border border-rule bg-surface p-8">
                    <span className="flex h-10 w-10 items-center justify-center border border-rule bg-paper text-ink-3">
                        <Icon name="search" size={18} />
                    </span>
                    <p className="mt-7 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-4">
                        Not in this account
                    </p>
                    <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.03em] text-ink">
                        Resume Not Found
                    </h2>
                    <p className="mt-3 text-[12px] leading-[1.75] text-ink-3">
                        The requested resume record was not found in your Puter storage or may have been deleted.
                    </p>
                    <Link to="/" className="primary-button mt-7 !px-4 !py-2.5 text-[12px]">
                        Return to Dashboard
                        <Icon name="arrow-right" size={14} />
                    </Link>
                </div>
            </main>
        );
    }

    if (isLoading || !resume) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-16">
                <div className="flex flex-col items-center gap-4 border border-rule bg-surface px-10 py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-rule border-t-cobalt" />
                    <h3 className="text-[13px] font-semibold text-ink-2">
                        Loading Resume Workspace...
                    </h3>
                    <p className="max-w-[260px] text-center text-[11px] leading-relaxed text-ink-4">
                        Retrieving document pages and AI evaluation from Puter KV
                    </p>
                </div>
            </main>
        );
    }

    const overallScore = resume.feedback?.overallScore ?? 0;

    return (
        <main className="flex min-h-screen flex-col bg-paper !pt-0">
            {/* Workspace header band */}
            <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur-sm">
                <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link
                            to="/dashboard"
                            className="no-print inline-flex shrink-0 items-center gap-1.5 border border-rule bg-surface px-2.5 py-2 text-[11px] font-semibold text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
                        >
                            <Icon name="arrow-left" size={13} />
                            <span className="hidden sm:inline">Dashboard</span>
                        </Link>

                        <span className="no-print hidden h-4 w-px bg-rule sm:block" />

                        <div className="flex min-w-0 flex-col">
                            <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">
                                {resume.jobTitle || "Resume Workspace"}
                            </span>
                            <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-ink-4">
                                <span className="truncate">{`• ${resume.companyName || "General application"}`}</span>
                                {resume.fileName && (
                                    <>
                                        <span className="shrink-0 text-ink-4/60">·</span>
                                        <span className="hidden truncate sm:inline">{resume.fileName}</span>
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                        {saveError ? (
                            <span className="no-print hidden items-center gap-1.5 text-[10px] text-red-700 sm:inline-flex">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                                Unsaved changes
                            </span>
                        ) : (
                            <span className="no-print hidden items-center gap-1.5 text-[10px] text-ink-4 sm:inline-flex">
                                <span className="h-1.5 w-1.5 rounded-full bg-forest" />
                                Cloud saved
                            </span>
                        )}
                        <ScoreBadge score={overallScore} variant="score" />
                        <button
                            type="button"
                            onClick={handleExportReport}
                            className="no-print inline-flex cursor-pointer items-center gap-1.5 border border-rule bg-surface px-3 py-2 text-[11px] font-semibold text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
                            title="Export complete ATS diagnostic report as Markdown"
                            aria-label="Export Evaluation Report"
                        >
                            <Icon name="files" size={14} />
                            <span className="hidden sm:inline">Export Report</span>
                        </button>
                        {resumeUrl && (
                            <a
                                href={resumeUrl}
                                download={resume.fileName || "resume.pdf"}
                                className="no-print inline-flex items-center gap-1.5 border border-rule bg-surface px-3 py-2 text-[11px] font-semibold text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
                            >
                                <Icon name="download" size={14} />
                                <span className="hidden sm:inline">Download</span>
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {saveError && (
                <div className="no-print mx-auto w-full max-w-[1920px] px-4 pt-4 sm:px-6 sm:pt-6">
                    <div
                        role="alert"
                        className="flex items-start gap-2 border border-rule border-l-2 border-l-rust bg-red-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-red-800"
                    >
                        <Icon name="alert" size={12} className="mt-0.5 shrink-0" />
                        <div>
                            <p className="font-semibold">Changes not saved</p>
                            <p>{saveError}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Workspace navigation rail */}
            <div className="no-print mx-auto w-full max-w-[1920px] px-4 pt-4 sm:px-6 sm:pt-6">
                <WorkspaceTabs
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    feedback={resume.feedback}
                    keywordAnalysis={resume.keywordAnalysis}
                    savedStarCount={resume.savedStarRewrites?.length || 0}
                    savedCoverLetterCount={resume.coverLetters?.length || 0}
                    interviewPrep={resume.interviewPrep}
                    copilotChat={resume.copilotChat}
                />
            </div>

            {/* Dual-pane review desk */}
            <div className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col items-stretch gap-4 p-4 sm:p-6 lg:flex-row">
                {/* LEFT PANE: Document */}
                <section
                    className="flex h-[360px] w-full shrink-0 flex-col sm:h-[500px] lg:sticky lg:top-[68px] lg:h-[calc(100vh-92px)] lg:w-[42%] xl:w-[40%]"
                    aria-label="Document Preview"
                >
                    <PdfPreviewer
                        resumeUrl={resumeUrl}
                        imageUrl={primaryImageUrl}
                        imageUrls={allImageUrls}
                        parsedText={resume.parsedText}
                        fileName={resume.fileName}
                        pageCount={resume.pageCount || allImageUrls.length || 1}
                        isLoading={false}
                        isScanned={resume.isScanned}
                        ocrApplied={resume.ocrApplied}
                    />
                </section>

                {/* RIGHT PANE: Evaluation & tools */}
                <section
                    className="flex min-h-[600px] w-full flex-col overflow-hidden border border-rule bg-surface lg:w-[58%] xl:w-[60%]"
                    aria-label="Resume Evaluation and Tools"
                >
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
                        {activeTab === "overview" && (
                            <OverviewTab
                                feedback={resume.feedback}
                                jobTitle={resume.jobTitle}
                                companyName={resume.companyName}
                                onNavigateTab={handleTabChange}
                            />
                        )}

                        {activeTab === "details" && (
                            <DetailsTab feedback={resume.feedback} />
                        )}

                        {activeTab === "keywords" && (
                            <KeywordGapTab
                                resumeId={resume.id}
                                parsedText={resume.parsedText}
                                jobTitle={resume.jobTitle}
                                companyName={resume.companyName}
                                jobDescription={resume.jobDescription}
                                initialKeywordAnalysis={resume.keywordAnalysis}
                                onSaveAnalysis={handleSaveKeywordAnalysis}
                            />
                        )}

                        {activeTab === "star" && (
                            <StarRewriterTab
                                resumeId={resume.id}
                                parsedText={resume.parsedText}
                                jobTitle={resume.jobTitle}
                                savedRewrites={resume.savedStarRewrites}
                                onSaveRewrite={handleSaveStarRewrite}
                                onDeleteRewrite={handleDeleteStarRewrite}
                            />
                        )}

                        {activeTab === "cover-letter" && (
                            <CoverLetterTab
                                resumeId={resume.id}
                                parsedText={resume.parsedText}
                                jobTitle={resume.jobTitle}
                                companyName={resume.companyName}
                                jobDescription={resume.jobDescription}
                                savedCoverLetters={resume.coverLetters}
                                onSaveCoverLetter={handleSaveCoverLetter}
                                onDeleteCoverLetter={handleDeleteCoverLetter}
                            />
                        )}

                        {activeTab === "interview-prep" && (
                            <InterviewPrepTab
                                resumeId={resume.id}
                                jobTitle={resume.jobTitle}
                                companyName={resume.companyName}
                                jobDescription={resume.jobDescription}
                                parsedText={resume.parsedText}
                                weaknesses={weaknesses}
                                atsScore={resume.feedback?.overallScore || resume.feedback?.ATS?.score}
                                initialInterviewPrep={resume.interviewPrep}
                                onSaveInterviewPrep={handleSaveInterviewPrep}
                            />
                        )}

                        {activeTab === "copilot" && (
                            <AICopilotTab
                                resumeId={resume.id}
                                parsedText={resume.parsedText}
                                jobTitle={resume.jobTitle}
                                companyName={resume.companyName}
                                jobDescription={resume.jobDescription}
                                feedback={resume.feedback}
                                keywordAnalysis={resume.keywordAnalysis}
                                chatHistory={resume.copilotChat}
                                onSaveChat={handleSaveCopilotChat}
                                onNavigateTab={handleTabChange}
                            />
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
};

export default function ResumeWorkspace() {
    return (
        <AuthGuard>
            <ResumeWorkspaceContent />
        </AuthGuard>
    );
}
