import { useState, useMemo, useEffect, useRef, type FC } from "react";
import { usePuterStore } from "~/services/puter/store";
import { useSafeTimeout } from "~/hooks/useSafeTimeout";
import { generateInterviewPrep, getDefaultInterviewQuestions } from "~/features/interview-prep/interviewPrepEngine";
import Icon from "~/components/ui/Icon";

interface InterviewPrepTabProps {
    resumeId?: string;
    jobTitle?: string;
    companyName?: string;
    jobDescription?: string;
    parsedText?: string;
    weaknesses?: string[];
    atsScore?: number;
    initialInterviewPrep?: InterviewPrepSection;
    onSaveInterviewPrep?: (prep: InterviewPrepSection) => Promise<void>;
}

type CategoryFilter = "all" | InterviewQuestionCategory | "bookmarked";

export const InterviewPrepTab: FC<InterviewPrepTabProps> = ({
    jobTitle = "Target Role",
    companyName = "Target Company",
    jobDescription = "",
    parsedText = "",
    weaknesses = [],
    atsScore = 70,
    initialInterviewPrep,
    onSaveInterviewPrep,
}) => {
    const { ai } = usePuterStore();
    const scheduleTimeout = useSafeTimeout();

    // Active state
    const [prepData, setPrepData] = useState<InterviewPrepSection | null>(
        initialInterviewPrep || null
    );
    const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
    const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({
        "q-1": true,
        "fallback-q1": true,
    });
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Scratchpad local editing state
    const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>(() => {
        const initialDrafts: Record<string, string> = {};
        if (Array.isArray(initialInterviewPrep?.questions)) {
            initialInterviewPrep.questions.forEach((q) => {
                if (q && (q.userPracticeResponse || q.userNotes)) {
                    initialDrafts[q.id] = q.userPracticeResponse || q.userNotes || "";
                }
            });
        }
        return initialDrafts;
    });

    // Let persisted questions refresh while in-progress local drafts keep precedence.
    useEffect(() => {
        if (initialInterviewPrep) {
            setPrepData(initialInterviewPrep);
            const initialDrafts: Record<string, string> = {};
            if (Array.isArray(initialInterviewPrep.questions)) {
                initialInterviewPrep.questions.forEach((q) => {
                    if (q && (q.userPracticeResponse || q.userNotes)) {
                        initialDrafts[q.id] = q.userPracticeResponse || q.userNotes || "";
                    }
                });
            }
            setDraftAnswers((prev) => ({ ...initialDrafts, ...prev }));
        }
    }, [initialInterviewPrep]);

    const questions = Array.isArray(prepData?.questions) ? prepData.questions : [];

    // Filter counts
    const counts = useMemo(() => {
        const behavioral = questions.filter((q) => q.category === "behavioral").length;
        const technical = questions.filter((q) => q.category === "technical").length;
        const situational = questions.filter((q) => q.category === "situational").length;
        const bookmarked = questions.filter((q) => q.isBookmarked).length;
        const practiced = questions.filter((q) => (draftAnswers[q.id] || q.userPracticeResponse || q.userNotes || "").trim().length > 0).length;
        return {
            total: questions.length,
            behavioral,
            technical,
            situational,
            bookmarked,
            practiced,
        };
    }, [questions, draftAnswers]);

    // Filtered list
    const filteredQuestions = useMemo(() => {
        if (selectedCategory === "all") return questions;
        if (selectedCategory === "bookmarked") return questions.filter((q) => q.isBookmarked);
        return questions.filter((q) => q.category === selectedCategory);
    }, [questions, selectedCategory]);

    // Accordion toggle
    const toggleAccordion = (id: string) => {
        setExpandedQuestions((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    // Expand / Collapse all
    const handleToggleAll = (expand: boolean) => {
        const next: Record<string, boolean> = {};
        questions.forEach((q) => {
            next[q.id] = expand;
        });
        setExpandedQuestions(next);
    };

    // 1-Click Copy of STAR model answer
    const handleCopyStarAnswer = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            scheduleTimeout(() => setCopiedId(null), 2500);
        } catch (err) {
            console.error("Failed to copy STAR answer:", err);
        }
    };

    // Bookmark / Star toggle
    const handleToggleBookmark = async (id: string) => {
        if (!prepData) return;
        const currentQuestions = Array.isArray(prepData.questions) ? prepData.questions : [];
        const updatedQuestions = currentQuestions.map((q) =>
            q.id === id ? { ...q, isBookmarked: !q.isBookmarked } : q
        );
        const updatedPrep: InterviewPrepSection = {
            ...prepData,
            questions: updatedQuestions,
            lastUpdatedAt: new Date().toISOString(),
        };
        setPrepData(updatedPrep);
        if (onSaveInterviewPrep) {
            try {
                await onSaveInterviewPrep(updatedPrep);
            } catch (err) {
                console.error("Failed to persist bookmark to KV:", err);
                if (isMountedRef.current) {
                    setErrorMessage(
                        "The bookmark changed in this tab, but it could not be saved to your resume and may be lost on reload."
                    );
                }
            }
        }
    };

    // Scratchpad save
    const handleSaveDraftAnswer = async (questionId: string) => {
        if (!prepData) return;
        const answerText = draftAnswers[questionId] || "";
        const currentQuestions = Array.isArray(prepData.questions) ? prepData.questions : [];
        const updatedQuestions = currentQuestions.map((q) =>
            q.id === questionId
                ? {
                      ...q,
                      userPracticeResponse: answerText,
                      userNotes: answerText,
                      lastPracticedAt: new Date().toISOString(),
                  }
                : q
        );
        const updatedPrep: InterviewPrepSection = {
            ...prepData,
            questions: updatedQuestions,
            lastUpdatedAt: new Date().toISOString(),
        };
        setPrepData(updatedPrep);
        if (onSaveInterviewPrep) {
            try {
                await onSaveInterviewPrep(updatedPrep);
                if (isMountedRef.current) {
                    setSavedDraftId(questionId);
                    scheduleTimeout(() => setSavedDraftId(null), 2500);
                }
            } catch (err) {
                console.error("Failed to persist draft to KV:", err);
                if (isMountedRef.current) {
                    setErrorMessage(
                        "Your practice answer is visible in this tab, but it could not be saved to your resume and may be lost on reload."
                    );
                }
            }
        }
    };

    // AI Generation Handler
    const handleGenerate = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        setErrorMessage(null);
        try {
            const result = await generateInterviewPrep(ai.chat, {
                resumeText: parsedText,
                jobTitle,
                companyName,
                jobDescription,
                weaknesses,
                atsScore,
            });

            if (isMountedRef.current) {
                // Expand first question by default
                if (result.questions?.[0]) {
                    setExpandedQuestions({ [result.questions[0].id]: true });
                }
                setPrepData(result);
            }
            if (onSaveInterviewPrep) {
                // Keep persistence in this try: a save rejection follows the legacy fallback path.
                await onSaveInterviewPrep(result);
            }
        } catch (err: unknown) {
            const generationError = err as { message?: string } | null | undefined;
            console.warn("AI generation failed, applying high-signal fallback questions:", err);
            // Fallback for resiliency
            const fallbackQuestions = getDefaultInterviewQuestions(jobTitle, companyName);
            const fallbackSection: InterviewPrepSection = {
                id: `prep-${Date.now()}`,
                roleTitle: jobTitle,
                targetRole: jobTitle,
                companyName,
                generatedAt: new Date().toISOString(),
                questions: fallbackQuestions,
            };
            if (isMountedRef.current) {
                setPrepData(fallbackSection);
                if (fallbackQuestions[0]) {
                    setExpandedQuestions({ [fallbackQuestions[0].id]: true });
                }
                setErrorMessage(`AI service note: Generated standard high-yield questions (${generationError?.message || "offline mode"}).`);
            }
            if (onSaveInterviewPrep) {
                try {
                    await onSaveInterviewPrep(fallbackSection);
                } catch (saveErr) {
                    console.error("Failed to persist fallback interview prep:", saveErr);
                    if (isMountedRef.current) {
                        setErrorMessage(
                            "Interview questions are visible in this tab, but they could not be saved to your resume and may be lost on reload."
                        );
                    }
                }
            }
        } finally {
            if (isMountedRef.current) {
                setIsGenerating(false);
            }
        }
    };

    return (
        <div
            id="tabpanel-interview-prep"
            role="tabpanel"
            aria-labelledby="tab-interview-prep"
            className="flex animate-fadeIn flex-col gap-5"
        >
            {/* Header band */}
            <div className="border border-rule bg-surface">
                <div className="flex flex-col justify-between gap-5 p-4 sm:p-5 md:flex-row md:items-center">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 border border-cobalt/25 bg-cobalt-wash px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-cobalt">
                                <Icon name="message" size={10} />
                                AI Copilot Action Engine
                            </span>
                            <span className="text-[10px] text-ink-4">Role-Specific Q&amp;A</span>
                        </div>
                        <h2 className="mt-3 text-[19px] font-semibold leading-snug tracking-[-0.025em] text-ink sm:text-[22px]">
                            Interview Preparation Engine
                        </h2>
                        <p className="mt-1.5 max-w-xl text-[11px] leading-[1.75] text-ink-3">
                            Anticipate high-probability interview questions anchored directly to your resume bullet points and ATS audit gaps, with recruiter intent, STAR blueprints, and pitfalls.
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-ink-3">
                            <span>
                                Role: <strong className="font-semibold text-ink-2">{jobTitle}</strong>
                            </span>
                            {companyName && (
                                <>
                                    <span className="h-3 w-px bg-rule" />
                                    <span>
                                        Target: <strong className="font-semibold text-ink-2">{companyName}</strong>
                                    </span>
                                </>
                            )}
                            <span className="h-3 w-px bg-rule" />
                            <span>
                                ATS Score: <strong className="font-semibold text-ink-2">{atsScore}/100</strong>
                            </span>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="primary-button w-full !px-4 !py-2.5 text-[11px] sm:w-auto"
                        >
                            {isGenerating ? (
                                <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-paper border-t-transparent" />
                                    <span>Curating Questions...</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="sparkle" size={13} />
                                    <span>{questions.length > 0 ? "Regenerate Questions" : "Generate 6-8 Questions"}</span>
                                </>
                            )}
                        </button>

                        {questions.length > 0 && (
                            <div className="flex items-center gap-2 text-[10px] tabular-nums text-ink-4">
                                <span>{counts.practiced}/{counts.total} Practiced</span>
                                <span>·</span>
                                <span>{counts.bookmarked} Starred</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {errorMessage && (
                <div className="flex items-start justify-between gap-3 border border-rule border-l-2 border-l-cobalt bg-cobalt-wash px-3.5 py-2.5 text-[11px] text-cobalt">
                    <span className="flex items-start gap-2">
                        <Icon name="info" size={12} className="mt-0.5 shrink-0" />
                        {errorMessage}
                    </span>
                    <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        className="shrink-0 cursor-pointer p-0.5 text-cobalt transition-colors hover:text-cobalt-deep"
                        aria-label="Dismiss error"
                    >
                        <Icon name="close" size={12} />
                    </button>
                </div>
            )}

            {/* Empty state */}
            {questions.length === 0 && !isGenerating && (
                <div className="flex flex-col items-start border border-rule bg-surface px-5 py-10 sm:px-6">
                    <span className="flex h-10 w-10 items-center justify-center border border-rule bg-paper text-cobalt">
                        <Icon name="message" size={17} />
                    </span>
                    <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-ink">
                        Ready to Master Your {jobTitle} Interview?
                    </h3>
                    <p className="mt-2 max-w-md text-[11px] leading-[1.75] text-ink-3">
                        Our AI Bar Raiser analyzes your resume text alongside your ATS evaluation to construct 6 to 8 tailored behavioral, technical, and situational interview questions with complete STAR model answers.
                    </p>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        className="primary-button mt-5 !px-4 !py-2.5 text-[11px]"
                    >
                        <Icon name="sparkle" size={13} />
                        Generate Interview Preparation Q&amp;A
                    </button>
                </div>
            )}

            {/* Questions */}
            {questions.length > 0 && (
                <div className="flex flex-col gap-4">
                    {/* Filter bar */}
                    <div className="flex flex-col justify-between gap-3 border border-rule bg-surface p-3 sm:flex-row sm:items-center">
                        <div className="no-scrollbar flex flex-wrap items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory("all")}
                                className={`cursor-pointer border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                    selectedCategory === "all"
                                        ? "border-ink bg-ink text-paper"
                                        : "border-rule bg-paper text-ink-3 hover:border-rule-strong hover:text-ink"
                                }`}
                            >
                                All ({counts.total})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory("behavioral")}
                                className={`cursor-pointer border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                    selectedCategory === "behavioral"
                                        ? "border-ink bg-ink text-paper"
                                        : "border-rule bg-paper text-ink-3 hover:border-rule-strong hover:text-ink"
                                }`}
                            >
                                Behavioral ({counts.behavioral})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory("technical")}
                                className={`cursor-pointer border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                    selectedCategory === "technical"
                                        ? "border-ink bg-ink text-paper"
                                        : "border-rule bg-paper text-ink-3 hover:border-rule-strong hover:text-ink"
                                }`}
                            >
                                Technical ({counts.technical})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory("situational")}
                                className={`cursor-pointer border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                    selectedCategory === "situational"
                                        ? "border-ink bg-ink text-paper"
                                        : "border-rule bg-paper text-ink-3 hover:border-rule-strong hover:text-ink"
                                }`}
                            >
                                Situational ({counts.situational})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory("bookmarked")}
                                aria-label={`★ Starred (${counts.bookmarked})`}
                                className={`inline-flex cursor-pointer items-center gap-1 border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                    selectedCategory === "bookmarked"
                                        ? "border-ink bg-ink text-paper"
                                        : "border-rule bg-paper text-ink-3 hover:border-rule-strong hover:text-ink"
                                }`}
                            >
                                <Icon name="star" size={9} />
                                Starred ({counts.bookmarked})
                            </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleToggleAll(true)}
                                className="cursor-pointer px-2 py-1 text-[10px] font-semibold text-cobalt transition-colors hover:text-cobalt-deep"
                            >
                                Expand All
                            </button>
                            <span className="h-3 w-px bg-rule" />
                            <button
                                type="button"
                                onClick={() => handleToggleAll(false)}
                                className="cursor-pointer px-2 py-1 text-[10px] font-semibold text-ink-3 transition-colors hover:text-ink"
                            >
                                Collapse All
                            </button>
                        </div>
                    </div>

                    {/* Question list */}
                    <div className="flex flex-col gap-2.5">
                        {filteredQuestions.map((q, idx) => {
                            const isExpanded = !!expandedQuestions[q.id];
                            const isCopied = copiedId === q.id;
                            const isDraftSaved = savedDraftId === q.id;
                            const currentDraft = draftAnswers[q.id] ?? q.userPracticeResponse ?? q.userNotes ?? "";

                            // Category tag
                            let badgeStyle = "border-rule bg-paper text-ink-3";
                            if (q.category === "behavioral") {
                                badgeStyle = "border-cobalt/25 bg-cobalt-wash text-cobalt";
                            } else if (q.category === "technical") {
                                badgeStyle = "border-green-200 bg-green-50 text-green-700";
                            } else if (q.category === "situational") {
                                badgeStyle = "border-amber-200 bg-amber-50 text-amber-800";
                            }

                            return (
                                <div
                                    key={q.id}
                                    className={`overflow-hidden border bg-surface transition-colors ${
                                        isExpanded ? "border-rule-strong" : "border-rule"
                                    }`}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3 p-3.5 sm:p-4">
                                        <div
                                            className="flex flex-1 cursor-pointer select-none items-start gap-2.5"
                                            onClick={() => toggleAccordion(q.id)}
                                        >
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-rule bg-paper text-[10px] font-semibold tabular-nums text-cobalt">
                                                {idx + 1}
                                            </span>
                                            <div className="flex-1">
                                                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                                    <span className={`border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] ${badgeStyle}`}>
                                                        {q.category}
                                                    </span>
                                                    {(q.userPracticeResponse || q.userNotes || draftAnswers[q.id]) && (
                                                        <span className="border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-blue-700">
                                                            Drafted
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-[12px] font-semibold leading-snug text-ink sm:text-[13px]">
                                                    "{q.question}"
                                                </h4>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                aria-label={q.isBookmarked ? "Remove Bookmark" : "Bookmark for Review"}
                                                title={q.isBookmarked ? "Remove Bookmark" : "Bookmark for Review"}
                                                onClick={() => handleToggleBookmark(q.id)}
                                                className={`flex h-8 w-8 cursor-pointer items-center justify-center border transition-colors ${
                                                    q.isBookmarked
                                                        ? "border-amber-200 bg-amber-50 text-amber-600"
                                                        : "border-transparent text-ink-4 hover:border-rule hover:text-amber-600"
                                                }`}
                                            >
                                                <Icon name="star" size={13} />
                                            </button>

                                            <button
                                                type="button"
                                                aria-label={isExpanded ? "Collapse Question Details" : "Expand Question Details"}
                                                onClick={() => toggleAccordion(q.id)}
                                                className="flex h-8 w-8 cursor-pointer items-center justify-center border border-transparent text-ink-3 transition-colors hover:border-rule hover:text-ink"
                                            >
                                                <Icon
                                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                                    size={13}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded body */}
                                    {isExpanded && (
                                        <div className="flex flex-col gap-3 border-t border-rule bg-surface-2 px-3.5 pb-4 pt-3 sm:px-4">
                                            {/* Recruiter intent */}
                                            <div className="flex items-start gap-2.5 border border-rule bg-surface p-3">
                                                <span className="mt-0.5 shrink-0 text-cobalt">
                                                    <Icon name="search" size={13} />
                                                </span>
                                                <div className="flex-1">
                                                    <span className="block text-[10px] font-semibold text-ink">
                                                        Recruiter Intent (What They're Evaluating):
                                                    </span>
                                                    <p className="mt-0.5 text-[10px] leading-relaxed text-ink-2">
                                                        {q.recruiterIntent}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Resume anchor */}
                                            <div className="flex items-start gap-2.5 border border-rule bg-surface p-3">
                                                <span className="mt-0.5 shrink-0 text-ink-3">
                                                    <Icon name="target" size={13} />
                                                </span>
                                                <div className="flex-1">
                                                    <span className="block text-[10px] font-semibold text-ink">
                                                        Resume Anchor / Trigger:
                                                    </span>
                                                    <p className="mt-0.5 text-[10px] leading-relaxed text-ink-2">
                                                        {q.resumeAnchor}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* STAR blueprint */}
                                            <div className="flex flex-col gap-3 border border-cobalt/20 bg-cobalt-wash/60 p-3.5">
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cobalt/15 pb-2">
                                                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-cobalt">
                                                        <Icon name="star" size={11} />
                                                        Recommended STAR Response Blueprint
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyStarAnswer(q.id, q.starModelAnswer.fullAnswer || "")}
                                                        className="inline-flex cursor-pointer items-center gap-1.5 border border-rule bg-surface px-2 py-1 text-[9px] font-semibold text-cobalt transition-colors hover:border-cobalt/40"
                                                    >
                                                        <Icon name={isCopied ? "check" : "copy"} size={10} />
                                                        <span>{isCopied ? "Copied!" : "1-Click Copy STAR Answer"}</span>
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 gap-px border border-rule bg-rule md:grid-cols-2">
                                                    <div className="bg-surface p-2.5">
                                                        <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-[0.08em] text-cobalt">
                                                            S — Situation
                                                        </span>
                                                        <p className="text-[10px] leading-relaxed text-ink-2">
                                                            {q.starModelAnswer.situation}
                                                        </p>
                                                    </div>
                                                    <div className="bg-surface p-2.5">
                                                        <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-[0.08em] text-cobalt">
                                                            T — Task
                                                        </span>
                                                        <p className="text-[10px] leading-relaxed text-ink-2">
                                                            {q.starModelAnswer.task}
                                                        </p>
                                                    </div>
                                                    <div className="bg-surface p-2.5">
                                                        <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-[0.08em] text-cobalt">
                                                            A — Action
                                                        </span>
                                                        <p className="text-[10px] leading-relaxed text-ink-2">
                                                            {q.starModelAnswer.action}
                                                        </p>
                                                    </div>
                                                    <div className="bg-surface p-2.5">
                                                        <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-[0.08em] text-cobalt">
                                                            R — Result
                                                        </span>
                                                        <p className="text-[10px] leading-relaxed text-ink-2">
                                                            {q.starModelAnswer.result}
                                                        </p>
                                                    </div>
                                                </div>

                                                {q.starModelAnswer.fullAnswer && (
                                                    <div className="flex flex-col gap-1 border border-ink bg-ink p-3">
                                                        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-paper/60">
                                                            Synthesized First-Person Model Response:
                                                        </span>
                                                        <p className="text-[10px] font-normal leading-relaxed text-paper">
                                                            "{q.starModelAnswer.fullAnswer}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Pitfalls */}
                                            {q.pitfallsToAvoid && q.pitfallsToAvoid.length > 0 && (
                                                <div className="flex items-start gap-2.5 border border-red-200 bg-red-50/60 p-3">
                                                    <span className="mt-0.5 shrink-0 text-rust">
                                                        <Icon name="alert" size={12} />
                                                    </span>
                                                    <div className="flex-1">
                                                        <span className="mb-1 block text-[10px] font-semibold text-red-900">
                                                            Pitfalls to Avoid (What NOT to Say):
                                                        </span>
                                                        <ul className="list-inside list-disc space-y-0.5 text-[10px] leading-relaxed text-red-900/90">
                                                            {q.pitfallsToAvoid.map((pitfall, pIdx) => (
                                                                <li key={pIdx}>{pitfall}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Scratchpad */}
                                            <div className="flex flex-col gap-2 border border-rule bg-surface p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <label
                                                        htmlFor={`scratchpad-${q.id}`}
                                                        className="flex items-center gap-1.5 text-[10px] font-semibold text-ink"
                                                    >
                                                        <Icon name="pen" size={11} className="text-ink-4" />
                                                        Candidate Practice Scratchpad
                                                    </label>
                                                    <span className="text-[9px] tabular-nums text-ink-4">
                                                        {currentDraft.trim().split(/\s+/).filter(Boolean).length} words
                                                    </span>
                                                </div>

                                                <textarea
                                                    id={`scratchpad-${q.id}`}
                                                    rows={3}
                                                    value={currentDraft}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setDraftAnswers((prev) => ({
                                                            ...prev,
                                                            [q.id]: val,
                                                        }));
                                                    }}
                                                    placeholder="Draft your own response here to rehearse before the interview..."
                                                    className="w-full resize-y text-[11px]"
                                                />

                                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                                    <span className="text-[9px] font-medium text-green-700">
                                                        {isDraftSaved ? "✓ Practice draft saved to cloud" : ""}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveDraftAnswer(q.id)}
                                                        className="inline-flex cursor-pointer items-center gap-1 border border-ink bg-ink px-2.5 py-1 text-[9px] font-semibold text-paper transition-colors hover:bg-ink-2"
                                                    >
                                                        <Icon name="save" size={10} />
                                                        Save Draft
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewPrepTab;
