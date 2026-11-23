import { useEffect, useMemo, useState, useRef } from "react";
import { usePuterStore } from "~/services/puter/store";
import { useSafeTimeout } from "~/hooks/useSafeTimeout";
import Icon from "~/components/ui/Icon";
import {
    generateCoverLetter,
    calculateWordCount,
    calculateReadingTimeMinutes,
} from "~/features/cover-letter/coverLetterEngine";

interface CoverLetterTabProps {
    resumeId?: string;
    parsedText?: string;
    jobTitle?: string;
    companyName?: string;
    jobDescription?: string;
    savedCoverLetters?: CoverLetter[];
    onSaveCoverLetter?: (letter: CoverLetter) => Promise<void>;
    onDeleteCoverLetter?: (letterId: string) => Promise<void>;
}

export const TONES: { id: CoverLetterTone; label: string; description: string }[] = [
    {
        id: "professional",
        label: "Professional",
        description: "Clear, structured, authoritative business communication with objective confidence.",
    },
    {
        id: "passionate",
        label: "Passionate",
        description: "High-energy, mission-driven, and expressive enthusiasm for product and mission.",
    },
    {
        id: "executive",
        label: "Executive",
        description: "Macro-level business ROI, leadership presence, transformation, and enterprise scale.",
    },
    {
        id: "conversational",
        label: "Conversational",
        description: "Direct, relatable, authentic human voice, modern tech culture, and collegiality.",
    },
];

export const CoverLetterTab = ({
    parsedText = "",
    jobTitle = "Software Engineer",
    companyName = "Target Company",
    jobDescription = "",
    savedCoverLetters = [],
    onSaveCoverLetter,
    onDeleteCoverLetter,
}: CoverLetterTabProps) => {
    const { ai } = usePuterStore();
    const scheduleTimeout = useSafeTimeout();

    const [selectedTone, setSelectedTone] = useState<CoverLetterTone>("professional");
    const [currentJobTitle, setCurrentJobTitle] = useState(jobTitle);
    const [currentCompany, setCurrentCompany] = useState(companyName);
    const [currentJobDescription, setCurrentJobDescription] = useState(jobDescription);
    const [customNotes, setCustomNotes] = useState("");
    const [showJdInput, setShowJdInput] = useState(Boolean(jobDescription));

    const [activeLetter, setActiveLetter] = useState<CoverLetter | null>(
        savedCoverLetters?.[0] || null
    );
    const [editableText, setEditableText] = useState(
        savedCoverLetters?.[0]?.fullText || ""
    );
    const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Keep inputs synced if parent props change
    useEffect(() => {
        if (jobTitle) setCurrentJobTitle(jobTitle);
    }, [jobTitle]);

    useEffect(() => {
        if (companyName) setCurrentCompany(companyName);
    }, [companyName]);

    useEffect(() => {
        if (jobDescription) setCurrentJobDescription(jobDescription);
    }, [jobDescription]);

    // When savedCoverLetters updates from parent (e.g. initial load), set active if none selected
    useEffect(() => {
        if (savedCoverLetters && savedCoverLetters.length > 0 && !activeLetter) {
            setActiveLetter(savedCoverLetters[0]);
            setEditableText(savedCoverLetters[0].fullText);
            setSelectedTone(savedCoverLetters[0].tone);
        }
    }, [savedCoverLetters, activeLetter]);

    // Live word count and reading time
    const wordCount = useMemo(() => calculateWordCount(editableText), [editableText]);
    const readingTime = useMemo(() => calculateReadingTimeMinutes(wordCount), [wordCount]);

    // Detect unsaved modifications
    const hasUnsavedChanges = useMemo(() => {
        if (!activeLetter) return Boolean(editableText.trim());
        return editableText.trim() !== activeLetter.fullText.trim();
    }, [editableText, activeLetter]);

    // Switch between saved drafts
    const handleSelectDraft = (letter: CoverLetter) => {
        setActiveLetter(letter);
        setEditableText(letter.fullText);
        setSelectedTone(letter.tone);
        if (letter.roleTitle || letter.jobTitle) {
            setCurrentJobTitle(letter.roleTitle || letter.jobTitle || "");
        }
        if (letter.companyName) {
            setCurrentCompany(letter.companyName);
        }
    };

    const handleGenerate = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        setErrorMessage(null);
        try {
            const letter = await generateCoverLetter(ai.chat, {
                resumeText: parsedText,
                jobTitle: currentJobTitle,
                companyName: currentCompany,
                jobDescription: currentJobDescription,
                tone: selectedTone,
                customNotes,
            });

            if (isMountedRef.current) {
                setActiveLetter(letter);
                setEditableText(letter.fullText);
            }

            if (onSaveCoverLetter) {
                try {
                    await onSaveCoverLetter(letter);
                } catch (saveErr) {
                    console.error("Failed to save generated cover letter:", saveErr);
                    if (isMountedRef.current) {
                        setErrorMessage(
                            "Cover letter generated, but it could not be saved to your resume. It remains visible in this tab and may be lost on reload."
                        );
                    }
                }
            }
        } catch (err) {
            console.error("Cover Letter generation failed:", err);
            if (isMountedRef.current) {
                setErrorMessage(
                    (err as { message?: string } | null)?.message ||
                        "Failed to generate cover letter. Please try again."
                );
            }
        } finally {
            if (isMountedRef.current) {
                setIsGenerating(false);
            }
        }
    };

    const handleSave = async () => {
        if (!activeLetter && !editableText.trim()) return;

        const updatedLetter: CoverLetter = {
            id: activeLetter?.id || `letter-${Date.now()}`,
            roleTitle: currentJobTitle,
            jobTitle: currentJobTitle,
            companyName: currentCompany,
            tone: selectedTone,
            subjectLine: activeLetter?.subjectLine || `Application for ${currentJobTitle} — Candidate`,
            salutation: activeLetter?.salutation || `Dear Hiring Team at ${currentCompany},`,
            hookParagraph: activeLetter?.hookParagraph || "",
            bodyParagraphs: activeLetter?.bodyParagraphs || [],
            closingParagraph: activeLetter?.closingParagraph || "",
            signOff: activeLetter?.signOff || "Sincerely,",
            fullText: editableText,
            wordCount,
            readingTimeMinutes: readingTime,
            createdAt: activeLetter?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (isMountedRef.current) {
            setActiveLetter(updatedLetter);
        }
        if (onSaveCoverLetter) {
            try {
                await onSaveCoverLetter(updatedLetter);
                if (isMountedRef.current) {
                    setErrorMessage(null);
                    setIsSaved(true);
                    scheduleTimeout(() => setIsSaved(false), 2500);
                }
            } catch (err) {
                console.error("Failed to save cover letter:", err);
                if (isMountedRef.current) {
                    setErrorMessage(
                        "Your latest cover letter edits could not be saved to your resume. They remain visible in this tab and may be lost on reload."
                    );
                }
            }
        }
    };

    const handleCopy = async () => {
        if (!editableText.trim()) return;
        try {
            await navigator.clipboard.writeText(editableText);
            if (isMountedRef.current) {
                setIsCopied(true);
                scheduleTimeout(() => setIsCopied(false), 2500);
            }
        } catch (err) {
            console.error("Failed to copy cover letter:", err);
        }
    };

    // Download as .txt file with safe object URL revocation
    const handleDownloadTxt = () => {
        if (!editableText.trim()) return;
        let url = "";
        try {
            const blob = new Blob([editableText], { type: "text/plain;charset=utf-8" });
            url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const sanitizedCompany = currentCompany.replace(/[^a-zA-Z0-9_-]/g, "_") || "Target";
            a.download = `Cover_Letter_${sanitizedCompany}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } finally {
            if (url) {
                setTimeout(() => {
                    try {
                        URL.revokeObjectURL(url);
                    } catch {
                        // Ignore
                    }
                }, 1000);
            }
        }
    };

    const handlePrint = () => {
        if (typeof window !== "undefined" && window.print) {
            window.print();
        }
    };

    return (
        <div
            id="tabpanel-cover-letter"
            role="tabpanel"
            aria-labelledby="tab-cover-letter"
            className="flex animate-fadeIn flex-col gap-5"
        >
            <div className="no-print border border-rule bg-surface">
                <div className="flex flex-col justify-between gap-5 p-4 sm:p-5 md:flex-row md:items-center">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 border border-cobalt/25 bg-cobalt-wash px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-cobalt">
                                <Icon name="pen" size={10} />
                                AI Action Engine
                            </span>
                            {savedCoverLetters && savedCoverLetters.length > 0 && (
                                <span className="text-[10px] text-ink-4">
                                    {savedCoverLetters.length} Saved Draft{savedCoverLetters.length > 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                        <h2 className="mt-3 text-[19px] font-semibold leading-snug tracking-[-0.025em] text-ink sm:text-[22px]">
                            Tailored AI Cover Letter Generator
                        </h2>
                        <p className="mt-1.5 max-w-xl text-[11px] leading-[1.75] text-ink-3">
                            Draft a compelling, authentic cover letter directly grounded in your verified resume achievements, tailored to the target employer across 4 strategic voice profiles.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="primary-button no-print w-full shrink-0 !px-4 !py-2.5 text-[11px] md:w-auto"
                    >
                        {isGenerating ? (
                            <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-paper border-t-transparent" />
                                <span>Composing Letter...</span>
                            </>
                        ) : (
                            <>
                                <Icon name="sparkle" size={13} />
                                <span>{activeLetter ? "Regenerate Cover Letter" : "Generate Tailored Letter"}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {errorMessage && (
                <div className="no-print flex items-start justify-between gap-3 border border-rule border-l-2 border-l-rust bg-red-50 px-3.5 py-2.5 text-[11px] text-red-800">
                    <span className="flex items-start gap-2">
                        <Icon name="alert" size={12} className="mt-0.5 shrink-0" />
                        {errorMessage}
                    </span>
                    <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        className="shrink-0 cursor-pointer p-0.5 text-red-600 transition-colors hover:text-red-900"
                        aria-label="Dismiss error"
                    >
                        <Icon name="close" size={12} />
                    </button>
                </div>
            )}

            <div className="no-print flex flex-col gap-4 border border-rule bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-3">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                        1. Target Role &amp; Tone Customizer
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowJdInput(!showJdInput)}
                        className="cursor-pointer text-[10px] font-semibold text-cobalt transition-colors hover:text-cobalt-deep"
                    >
                        {showJdInput ? "− Hide Job Description" : "+ Add Target Job Description"}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="form-div">
                        <label htmlFor="cover-letter-job-title">Target Job Title</label>
                        <input
                            id="cover-letter-job-title"
                            type="text"
                            value={currentJobTitle}
                            onChange={(e) => setCurrentJobTitle(e.target.value)}
                            placeholder="e.g. Senior Full-Stack Engineer"
                            className="!py-2 text-[12px]"
                        />
                    </div>
                    <div className="form-div">
                        <label htmlFor="cover-letter-company">Target Company / Organization</label>
                        <input
                            id="cover-letter-company"
                            type="text"
                            value={currentCompany}
                            onChange={(e) => setCurrentCompany(e.target.value)}
                            placeholder="e.g. Stripe, Airbnb, Scale AI"
                            className="!py-2 text-[12px]"
                        />
                    </div>
                </div>

                {showJdInput && (
                    <div className="form-div">
                        <label htmlFor="cover-letter-jd">
                            Target Job Description (Optional context for tighter keyword alignment)
                        </label>
                        <textarea
                            id="cover-letter-jd"
                            rows={3}
                            value={currentJobDescription}
                            onChange={(e) => setCurrentJobDescription(e.target.value)}
                            placeholder="Paste requirements, tech stack, or responsibilities to match..."
                            className="text-[12px]"
                        />
                    </div>
                )}

                <div className="form-div">
                    <label htmlFor="cover-letter-custom-notes">
                        Special Instructions or Highlights (Optional)
                    </label>
                    <input
                        id="cover-letter-custom-notes"
                        type="text"
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="e.g. Highlight distributed systems experience and remote squad leadership..."
                        className="!py-2 text-[12px]"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-[11px] font-semibold text-ink-2">
                        Select Cover Letter Tone:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {TONES.map((tone) => {
                            const isSelected = selectedTone === tone.id;
                            return (
                                <button
                                    key={tone.id}
                                    type="button"
                                    onClick={() => setSelectedTone(tone.id)}
                                    className={`cursor-pointer border p-2.5 text-left transition-colors ${
                                        isSelected
                                            ? "border-cobalt bg-indigo-50/70 text-ink"
                                            : "border-rule bg-paper text-ink-2 hover:border-rule-strong"
                                    }`}
                                >
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-semibold">{tone.label}</span>
                                        {isSelected && (
                                            <Icon name="check" size={11} className="shrink-0 text-cobalt" />
                                        )}
                                    </div>
                                    <p className="text-[10px] leading-snug text-ink-4">
                                        {tone.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {savedCoverLetters && savedCoverLetters.length > 0 && (
                <div className="no-print flex flex-wrap items-center justify-between gap-3 border border-rule bg-surface p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                            Saved Drafts:
                        </span>
                        {savedCoverLetters.map((draft, idx) => {
                            const isActive = activeLetter?.id === draft.id;
                            const baseName = draft.companyName || "Draft";
                            const key = `${baseName}::${draft.tone}`;
                            const sameKeyDrafts = savedCoverLetters.filter(
                                (d) => `${d.companyName || "Draft"}::${d.tone}` === key
                            );
                            const isDuplicate = sameKeyDrafts.length > 1;
                            const duplicateIndex = sameKeyDrafts.indexOf(draft) + 1;
                            const displayLabel = isDuplicate
                                ? `${baseName} #${duplicateIndex}`
                                : baseName;

                            return (
                                <button
                                    key={draft.id || idx}
                                    type="button"
                                    onClick={() => handleSelectDraft(draft)}
                                    className={`no-print flex cursor-pointer items-center gap-1.5 border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                                        isActive
                                            ? "border-ink bg-ink text-paper"
                                            : "border-rule bg-paper text-ink-3 hover:border-rule-strong hover:text-ink"
                                    }`}
                                >
                                    <span>{displayLabel}</span>
                                    <span className="text-[8px] uppercase opacity-70">({draft.tone})</span>
                                </button>
                            );
                        })}
                    </div>

                    {activeLetter && onDeleteCoverLetter && (
                        <button
                            type="button"
                            onClick={async () => {
                                if (window.confirm("Delete this saved cover letter draft?")) {
                                    try {
                                        await onDeleteCoverLetter(activeLetter.id);
                                        setActiveLetter(null);
                                        setEditableText("");
                                        setErrorMessage(null);
                                    } catch (err) {
                                        console.error("Failed to delete cover letter:", err);
                                        setErrorMessage(
                                            "The cover letter draft could not be deleted from your resume. Please try again."
                                        );
                                    }
                                }
                            }}
                            className="no-print inline-flex cursor-pointer items-center gap-1 px-1 py-0.5 text-[10px] font-medium text-rust transition-colors hover:text-red-700"
                        >
                            <Icon name="trash" size={10} />
                            Delete Active Draft
                        </button>
                    )}
                </div>
            )}

            {editableText.trim().length > 0 ? (
                <div className="flex flex-col overflow-hidden border border-rule bg-surface print:border-none print:p-0">
                    <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-surface-2 p-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="no-print inline-flex border border-rule bg-paper p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("edit")}
                                    className={`flex min-h-[30px] cursor-pointer items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                        viewMode === "edit"
                                            ? "bg-ink text-paper"
                                            : "text-ink-3 hover:text-ink"
                                    }`}
                                >
                                    <Icon name="pen" size={11} />
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("preview")}
                                    className={`flex min-h-[30px] cursor-pointer items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                        viewMode === "preview"
                                            ? "bg-ink text-paper"
                                            : "text-ink-3 hover:text-ink"
                                    }`}
                                >
                                    <Icon name="file" size={11} />
                                    Paper Preview
                                </button>
                            </div>

                            <div className="flex items-center gap-1.5 border-l border-rule pl-2 text-[10px] text-ink-3">
                                <span className="tabular-nums"><strong className="font-semibold text-ink-2">{wordCount}</strong> words</span>
                                <span className="text-ink-4">·</span>
                                <span className="tabular-nums">~<strong className="font-semibold text-ink-2">{readingTime}</strong> min read</span>
                            </div>

                            {hasUnsavedChanges && (
                                <span className="border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                                    Unsaved Changes
                                </span>
                            )}
                        </div>

                        <div className="no-print flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleSave}
                                className="no-print inline-flex min-h-[30px] cursor-pointer items-center gap-1.5 border border-cobalt/25 bg-cobalt-wash px-2.5 py-1 text-[10px] font-semibold text-cobalt transition-colors hover:border-cobalt/40"
                            >
                                <Icon name={isSaved ? "check" : "save"} size={11} />
                                <span>{isSaved ? "Saved!" : "Save Draft"}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleCopy}
                                className="no-print inline-flex min-h-[30px] cursor-pointer items-center gap-1.5 border border-rule bg-paper px-2.5 py-1 text-[10px] font-semibold text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
                            >
                                <Icon name={isCopied ? "check" : "copy"} size={11} />
                                <span>{isCopied ? "Copied!" : "1-Click Copy"}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleDownloadTxt}
                                className="no-print inline-flex min-h-[30px] cursor-pointer items-center gap-1.5 border border-rule bg-paper px-2.5 py-1 text-[10px] font-semibold text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
                            >
                                <Icon name="download" size={11} />
                                <span>Download .txt</span>
                            </button>

                            <button
                                type="button"
                                onClick={handlePrint}
                                className="no-print inline-flex min-h-[30px] cursor-pointer items-center gap-1.5 border border-ink bg-ink px-2.5 py-1 text-[10px] font-semibold text-paper transition-colors hover:bg-ink-2"
                            >
                                <Icon name="printer" size={11} />
                                <span>Print / PDF</span>
                            </button>
                        </div>
                    </div>

                    {viewMode === "edit" ? (
                        <div className="no-print p-3.5 sm:p-4">
                            <textarea
                                aria-label="Cover Letter Document Editor"
                                value={editableText}
                                onChange={(e) => setEditableText(e.target.value)}
                                rows={18}
                                className="w-full resize-y border border-rule bg-paper p-4 font-serif text-[12px] leading-relaxed text-ink shadow-none sm:text-[13px]"
                                placeholder="Your generated cover letter will appear here..."
                            />
                        </div>
                    ) : (
                        <div className="no-print flex justify-center bg-surface-2 p-5 sm:p-8">
                            <div className="w-full max-w-2xl whitespace-pre-wrap border border-rule bg-white p-6 font-serif text-[12px] leading-relaxed text-ink shadow-none sm:p-10 sm:text-[13px]">
                                {editableText}
                            </div>
                        </div>
                    )}

                    <div id="printable-cover-letter" className="hidden print:block font-serif text-black leading-relaxed whitespace-pre-wrap">
                        {editableText}
                    </div>
                </div>
            ) : (
                <div className="no-print flex flex-col items-start border border-rule bg-surface px-5 py-10 sm:px-6">
                    <span className="flex h-10 w-10 items-center justify-center border border-rule bg-paper text-cobalt">
                        <Icon name="file" size={17} />
                    </span>
                    <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-ink">
                        Generate Your Tailored Cover Letter
                    </h3>
                    <p className="mt-2 max-w-md text-[11px] leading-[1.75] text-ink-3">
                        Customize target role, company, and voice tone above, then click generate. Resumind will compose a professional cover letter citing verified metrics from your resume.
                    </p>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="primary-button mt-5 !px-4 !py-2.5 text-[11px]"
                    >
                        {isGenerating ? (
                            <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-paper border-t-transparent" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Icon name="sparkle" size={13} />
                                <span>Generate Cover Letter Now</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CoverLetterTab;
