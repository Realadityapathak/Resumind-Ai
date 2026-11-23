import { useState, useMemo, useEffect, useRef, type FC } from "react";
import { usePuterStore } from "~/services/puter/store";
import { useSafeTimeout } from "~/hooks/useSafeTimeout";
import { executeKeywordGapAnalysis } from "~/features/keyword-gap/keywordGapEngine";
import { tokenizeAndMatchKeywords } from "~/features/keyword-gap/keywordMatcher";
import Icon from "~/components/ui/Icon";

export interface KeywordGapTabProps {
    resumeId: string;
    parsedText?: string;
    jobTitle?: string;
    companyName?: string;
    jobDescription?: string;
    initialKeywordAnalysis?: KeywordAnalysis;
    onSaveAnalysis: (analysis: KeywordAnalysis) => Promise<void>;
}

export const KeywordGapTab: FC<KeywordGapTabProps> = ({
    parsedText = "",
    jobTitle = "",
    jobDescription = "",
    initialKeywordAnalysis,
    onSaveAnalysis,
}) => {
    const { ai } = usePuterStore();
    const scheduleTimeout = useSafeTimeout();
    const [jobDescInput, setJobDescInput] = useState<string>(jobDescription || "");
    const [isEditingJd, setIsEditingJd] = useState<boolean>(!jobDescription || !initialKeywordAnalysis);
    const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(initialKeywordAnalysis || null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleRunAnalysis = async () => {
        if (isAnalyzing) return;
        const textToAnalyze = jobDescInput.trim();
        if (textToAnalyze.length < 20) {
            setStatusMessage("Please provide a job description with at least 20 characters.");
            return;
        }

        setIsAnalyzing(true);
        setStatusMessage(null);

        try {
            let result: KeywordAnalysis;

            // Keep deterministic results available when Puter AI is unavailable or returns invalid data.
            try {
                result = await executeKeywordGapAnalysis(ai.chat, {
                    resumeText: parsedText,
                    jobTitle,
                    jobDescription: textToAnalyze,
                });
            } catch (aiErr) {
                console.warn("AI keyword analysis failed, falling back to deterministic tokenizer:", aiErr);
                result = tokenizeAndMatchKeywords(parsedText, textToAnalyze);
            }

            if (isMountedRef.current) {
                setAnalysis(result);
                setIsEditingJd(false);
            }
            try {
                await onSaveAnalysis(result);
                if (isMountedRef.current) {
                    setStatusMessage("Keyword gap analysis completed and saved!");
                    scheduleTimeout(() => setStatusMessage(null), 3500);
                }
            } catch (saveErr) {
                console.error("Failed to save keyword analysis:", saveErr);
                if (isMountedRef.current) {
                    setStatusMessage(
                        "Keyword gap analysis generated, but it could not be saved to your resume. Results are visible in this tab and may be lost on reload."
                    );
                }
            }
        } catch (err) {
            console.error("Keyword analysis failed:", err);
            if (isMountedRef.current) {
                setStatusMessage(
                    `Analysis failed: ${(err as { message?: string } | null)?.message || "Unknown error"}`
                );
            }
        } finally {
            if (isMountedRef.current) {
                setIsAnalyzing(false);
            }
        }
    };

    // Filter keywords
    const filterKeyword = (item: KeywordItem) => {
        if (!item) return false;
        const matchesCategory =
            categoryFilter === "all" || item.category === categoryFilter;
        const keyword = typeof item.keyword === "string" ? item.keyword : "";
        const matchesSearch =
            !searchQuery ||
            keyword.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    };

    const filteredMatched = useMemo(() => {
        const list = Array.isArray(analysis?.matchedKeywords) ? analysis.matchedKeywords : [];
        return list.filter(filterKeyword);
    }, [analysis?.matchedKeywords, categoryFilter, searchQuery]);

    const filteredMissing = useMemo(() => {
        const list = Array.isArray(analysis?.missingKeywords) ? analysis.missingKeywords : [];
        return list.filter(filterKeyword);
    }, [analysis?.missingKeywords, categoryFilter, searchQuery]);

    const matchRate = analysis?.matchRate ?? 0;

    return (
        <div
            id="tabpanel-keywords"
            role="tabpanel"
            aria-labelledby="tab-keywords"
            className="flex animate-fadeIn flex-col gap-5"
        >
            {/* Header & JD editor */}
            <div className="border border-rule bg-surface">
                <div className="flex flex-col justify-between gap-3 border-b border-rule px-4 py-3.5 sm:flex-row sm:items-start sm:px-5">
                    <div>
                        <h2 className="flex items-center gap-2 text-[17px] font-semibold leading-snug tracking-[-0.02em] text-ink">
                            <span className="text-cobalt">
                                <Icon name="target" size={16} />
                            </span>
                            ATS Keyword Gap Matrix
                        </h2>
                        <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-ink-3">
                            Compare your resume's terminology against the target job posting to pass automated screening filters.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsEditingJd((prev) => !prev)}
                        className="inline-flex w-fit shrink-0 cursor-pointer items-center gap-1.5 border border-rule bg-paper px-2.5 py-1.5 text-[10px] font-semibold text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
                    >
                        {isEditingJd ? "Hide Job Description" : "Edit Job Description"}
                    </button>
                </div>

                {isEditingJd && (
                    <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
                        <label htmlFor="jd-textarea" className="text-[11px] font-semibold text-ink-2">
                            Target Job Description
                        </label>
                        <textarea
                            id="jd-textarea"
                            rows={6}
                            value={jobDescInput}
                            onChange={(e) => setJobDescInput(e.target.value)}
                            placeholder="Paste the target job description requirements and qualifications here..."
                            className="w-full text-[12px]"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-[10px] tabular-nums text-ink-4">
                                {jobDescInput.length} characters
                            </span>
                            <button
                                type="button"
                                onClick={handleRunAnalysis}
                                disabled={isAnalyzing || jobDescInput.trim().length < 20}
                                className="primary-button !px-4 !py-2 text-[11px]"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-paper border-t-transparent" />
                                        <span>Analyzing Keywords...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="search" size={13} />
                                        <span>Scan &amp; Match Keywords</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {statusMessage && (
                    <div className="flex items-start gap-2 border-t border-rule bg-cobalt-wash px-4 py-2.5 text-[11px] text-cobalt sm:px-5">
                        <Icon name="info" size={12} className="mt-0.5 shrink-0" />
                        {statusMessage}
                    </div>
                )}
            </div>

            {/* Results */}
            {analysis ? (
                <>
                    {/* Match rate summary */}
                    <div className="border border-rule bg-surface">
                        <div className="flex flex-col items-start justify-between gap-5 p-4 sm:flex-row sm:items-center sm:p-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center border border-rule bg-paper">
                                    <span className="text-[20px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-cobalt">
                                        {matchRate}%
                                    </span>
                                    <span className="mt-1 text-[8px] font-medium uppercase tracking-[0.08em] text-ink-4">
                                        Match
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-[14px] font-semibold text-ink">
                                        {matchRate >= 80
                                            ? "Outstanding Keyword Alignment"
                                            : matchRate >= 60
                                            ? "Good ATS Keyword Match"
                                            : "Significant Keyword Gaps Detected"}
                                    </h3>
                                    <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
                                        Found <span className="font-semibold text-green-700">{analysis.matchedCount}</span> of{" "}
                                        <span className="font-semibold text-ink-2">{analysis.totalJobKeywords}</span> required competencies.{" "}
                                        <span className="font-semibold text-amber-700">{analysis.missingCount}</span> keywords are currently absent.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">
                                    <Icon name="check" size={10} />
                                    {analysis.matchedCount} Matched
                                </span>
                                <span className="inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">
                                    <Icon name="alert" size={10} />
                                    {analysis.missingCount} Missing
                                </span>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-col items-stretch justify-between gap-3 border-t border-rule px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                            <div className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto sm:w-auto">
                                {[
                                    { id: "all", label: "All Skills" },
                                    { id: "technical", label: "Technical" },
                                    { id: "soft", label: "Soft Skills" },
                                    { id: "domain", label: "Domain" },
                                    { id: "tools", label: "Tools" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setCategoryFilter(tab.id)}
                                        className={`shrink-0 cursor-pointer whitespace-nowrap border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                            categoryFilter === tab.id
                                                ? "border-ink bg-ink text-paper"
                                                : "border-rule bg-paper text-ink-3 hover:border-rule-strong hover:text-ink"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full sm:w-56">
                                <Icon
                                    name="search"
                                    size={12}
                                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4"
                                />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search keywords..."
                                    className="w-full !border-rule !bg-paper py-1.5 pl-7 pr-2.5 text-[11px]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Two-column keyword board */}
                    <div className="grid grid-cols-1 gap-px border border-rule bg-rule md:grid-cols-2">
                        {/* Matched */}
                        <div className="flex flex-col gap-3 bg-surface p-4">
                            <div className="flex items-center justify-between gap-3 border-b border-rule pb-2.5">
                                <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-green-800">
                                    <Icon name="check" size={11} />
                                    Matched in Resume ({filteredMatched.length})
                                </h4>
                                <span className="text-[9px] font-medium uppercase tracking-[0.06em] text-ink-4">ATS Verified</span>
                            </div>

                            {filteredMatched.length === 0 ? (
                                <p className="py-4 text-center text-[11px] text-ink-4">
                                    No matched keywords under this filter.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {filteredMatched.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-1.5 border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-medium text-green-900 transition-colors hover:bg-green-100"
                                            title={item.contextOrSuggestion || `${item.frequencyInResume} mention(s)`}
                                        >
                                            <span>{item.keyword}</span>
                                            <span className="bg-green-200/80 px-1 py-0.5 text-[9px] font-semibold tabular-nums text-green-800">
                                                {item.frequencyInResume}x
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Missing */}
                        <div className="flex flex-col gap-3 bg-surface p-4">
                            <div className="flex items-center justify-between gap-3 border-b border-rule pb-2.5">
                                <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-900">
                                    <Icon name="alert" size={11} />
                                    Missing Keywords ({filteredMissing.length})
                                </h4>
                                <span className="text-[9px] font-medium uppercase tracking-[0.06em] text-ink-4">Needs Inclusion</span>
                            </div>

                            {filteredMissing.length === 0 ? (
                                <p className="py-4 text-center text-[11px] text-ink-4">
                                    All keywords in this category are present!
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2 pt-0.5">
                                    {filteredMissing.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex flex-col gap-1 border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-amber-950"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-amber-900">{item.keyword}</span>
                                                <span
                                                    className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                                                        item.importance === "critical"
                                                            ? "bg-red-100 text-red-700"
                                                            : item.importance === "recommended"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : "bg-surface-2 text-ink-3"
                                                    }`}
                                                >
                                                    {item.importance}
                                                </span>
                                            </div>
                                            {item.contextOrSuggestion && (
                                                <p className="mt-0.5 flex items-start gap-1.5 text-[10px] leading-relaxed text-amber-900/80">
                                                    <Icon name="info" size={10} className="mt-0.5 shrink-0" />
                                                    {item.contextOrSuggestion}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recommendations */}
                    {analysis.topRecommendations && analysis.topRecommendations.length > 0 && (
                        <div className="border border-rule bg-cobalt-wash/60 p-4 text-[11px] text-ink-2">
                            <h4 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-cobalt">
                                <Icon name="sparkle" size={12} />
                                ATS Algorithm Recommendations
                            </h4>
                            <ul className="list-inside list-disc space-y-1 leading-relaxed text-ink-2">
                                {analysis.topRecommendations.map((rec, idx) => (
                                    <li key={idx}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-start border border-rule bg-surface px-5 py-10 sm:px-6">
                    <span className="flex h-10 w-10 items-center justify-center border border-rule bg-paper text-cobalt">
                        <Icon name="target" size={17} />
                    </span>
                    <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-ink">
                        No Keyword Gap Analysis Run Yet
                    </h3>
                    <p className="mt-2 max-w-md text-[11px] leading-relaxed text-ink-3">
                        Paste the target job description above and run the scanner to generate your personalized keyword match report.
                    </p>
                    <button
                        type="button"
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing || jobDescInput.trim().length < 20}
                        className="primary-button mt-5 !px-4 !py-2.5 text-[11px]"
                    >
                        {isAnalyzing ? "Scanning..." : "Run ATS Keyword Analysis"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default KeywordGapTab;
