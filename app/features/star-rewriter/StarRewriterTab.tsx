import { useState, useMemo, useEffect, useRef, type ChangeEvent, type FC } from "react";
import { usePuterStore } from "~/services/puter/store";
import { useSafeTimeout } from "~/hooks/useSafeTimeout";
import { rewriteBulletWithStar } from "~/features/star-rewriter/starRewriterEngine";
import Icon, { type IconName } from "~/components/ui/Icon";

export interface StarRewriterTabProps {
    resumeId: string;
    parsedText?: string;
    jobTitle?: string;
    savedRewrites?: StarRewriteResult[];
    onSaveRewrite: (rewrite: StarRewriteResult) => Promise<void>;
    onDeleteRewrite?: (rewriteId: string) => Promise<void>;
}

export const StarRewriterTab: FC<StarRewriterTabProps> = ({
    parsedText = "",
    jobTitle = "",
    savedRewrites = [],
    onSaveRewrite,
    onDeleteRewrite,
}) => {
    const { ai } = usePuterStore();
    const scheduleTimeout = useSafeTimeout();
    const [bulletInput, setBulletInput] = useState<string>("");
    const [tonePreference, setTonePreference] = useState<StarToneFocus>("action-oriented");
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [currentResult, setCurrentResult] = useState<StarRewriteResult | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({
        "variant-1": true,
    });
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Keep extraction conservative so arbitrary resume prose is not offered as a bullet.
    const extractedBullets = useMemo(() => {
        if (!parsedText) return [];
        const lines = parsedText.split(/\r?\n/);
        const bullets: string[] = [];
        for (const line of lines) {
            const trimmed = line.trim();
            // Match bullet symbols or typical experience lines
            const match = trimmed.match(/^[\u2022\u25E6\u2023\u2219\*\-–—]\s*(.{15,})$/);
            if (match && match[1]) {
                bullets.push(match[1].trim());
            } else if (
                trimmed.length >= 25 &&
                trimmed.length <= 200 &&
                /^[A-Z]/.test(trimmed) &&
                /(ed|ing|d)\b/i.test(trimmed.split(" ")[0] || "")
            ) {
                bullets.push(trimmed);
            }
        }
        return Array.from(new Set(bullets)).slice(0, 15);
    }, [parsedText]);

    const handleSelectExtractedBullet = (e: ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val) {
            setBulletInput(val);
        }
    };

    const handleGenerate = async () => {
        if (isGenerating) return;
        const text = bulletInput.trim();
        if (text.length < 5) {
            setStatusMessage("Please enter a bullet point with at least 5 characters.");
            return;
        }

        setIsGenerating(true);
        setStatusMessage(null);

        try {
            const result = await rewriteBulletWithStar(ai.chat, {
                bulletPoint: text,
                targetRole: jobTitle || "Software Engineer",
                tonePreference,
            });

            if (isMountedRef.current) {
                setCurrentResult(result);
                setStatusMessage("Generated 3 STAR variants successfully!");
                scheduleTimeout(() => setStatusMessage(null), 3500);
            }
        } catch (err) {
            console.error("STAR rewriting failed:", err);
            if (isMountedRef.current) {
                setStatusMessage(
                    `Generation failed: ${(err as { message?: string } | null)?.message || "Unknown error"}`
                );
            }
        } finally {
            if (isMountedRef.current) {
                setIsGenerating(false);
            }
        }
    };

    const handleCopy = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            if (isMountedRef.current) {
                setCopiedId(id);
                scheduleTimeout(() => setCopiedId(null), 2000);
            }
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleSave = async (resultToSave: StarRewriteResult) => {
        try {
            await onSaveRewrite(resultToSave);
            if (isMountedRef.current) {
                setStatusMessage("Saved rewrite to resume history!");
                scheduleTimeout(() => setStatusMessage(null), 2500);
            }
        } catch (err) {
            console.error("Failed to save rewrite:", err);
            if (isMountedRef.current) {
                setStatusMessage(
                    `Failed to save: ${(err as { message?: string } | null)?.message || (err as string)}`
                );
            }
        }
    };

    const handleDeleteSavedRewrite = async (rewriteId: string) => {
        if (!onDeleteRewrite) return;
        try {
            await onDeleteRewrite(rewriteId);
            if (isMountedRef.current) {
                setStatusMessage("Removed rewrite from resume history.");
                scheduleTimeout(() => setStatusMessage(null), 2500);
            }
        } catch (err) {
            console.error("Failed to delete rewrite:", err);
            if (isMountedRef.current) {
                setStatusMessage(
                    `Failed to delete rewrite: ${(err as { message?: string } | null)?.message || (err as string)}`
                );
            }
        }
    };

    const toggleBreakdown = (variantId: string) => {
        setExpandedBreakdowns((prev) => ({
            ...prev,
            [variantId]: !prev[variantId],
        }));
    };

    const toneOptions: { id: StarToneFocus; label: string; icon: IconName }[] = [
        { id: "action-oriented", label: "Action-Oriented", icon: "arrow-up-right" },
        { id: "metrics-focused", label: "Metrics & Scale", icon: "chart" },
        { id: "technical-depth", label: "Technical Depth", icon: "layout" },
        { id: "leadership-focused", label: "Leadership", icon: "user" },
        { id: "executive", label: "Executive Impact", icon: "target" },
    ];

    return (
        <div
            id="tabpanel-star"
            role="tabpanel"
            aria-labelledby="tab-star"
            className="flex animate-fadeIn flex-col gap-5"
        >
            {/* Input sheet */}
            <div className="border border-rule bg-surface">
                <div className="border-b border-rule px-4 py-3.5 sm:px-5">
                    <h2 className="flex items-center gap-2 text-[17px] font-semibold leading-snug tracking-[-0.02em] text-ink">
                        <span className="text-cobalt">
                            <Icon name="sparkle" size={16} />
                        </span>
                        AI STAR Bullet Rewriter
                    </h2>
                    <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-ink-3">
                        Transform weak resume bullets into quantifiable achievements following Google's formula: "Accomplished [X] as measured by [Y], by doing [Z]".
                    </p>
                </div>

                <div className="flex flex-col gap-4 p-4 sm:p-5">
                    {/* Dropdown to pick bullet from resume */}
                    {extractedBullets.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="extracted-bullets-select" className="text-[11px] font-semibold text-ink-2">
                                Or pick a bullet from your resume:
                            </label>
                            <select
                                id="extracted-bullets-select"
                                onChange={handleSelectExtractedBullet}
                                className="w-full cursor-pointer truncate text-[11px]"
                                defaultValue=""
                            >
                                <option value="" disabled>
                                    Select a bullet point from extracted text...
                                </option>
                                {extractedBullets.map((b, idx) => (
                                    <option key={idx} value={b}>
                                        {b}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Bullet input */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="bullet-textarea" className="text-[11px] font-semibold text-ink-2">
                            Original Bullet Point:
                        </label>
                        <textarea
                            id="bullet-textarea"
                            rows={3}
                            value={bulletInput}
                            onChange={(e) => setBulletInput(e.target.value)}
                            placeholder="e.g. Worked on frontend features and fixed bugs in React application."
                            className="w-full text-[12px]"
                        />
                        <div className="flex items-center justify-between text-[10px] text-ink-4">
                            <span className="tabular-nums">{bulletInput.length} characters</span>
                            <span>Minimum 5 characters</span>
                        </div>
                    </div>

                    {/* Tone pills */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-semibold text-ink-2">Target Tone / Focus:</label>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {toneOptions.map((tone) => (
                                <button
                                    key={tone.id}
                                    type="button"
                                    onClick={() => setTonePreference(tone.id)}
                                    className={`flex cursor-pointer items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                                        tonePreference === tone.id
                                            ? "border-ink bg-ink text-paper"
                                            : "border-rule bg-paper text-ink-3 hover:border-rule-strong hover:text-ink"
                                    }`}
                                >
                                    <Icon name={tone.icon} size={11} />
                                    <span>{tone.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
                        {statusMessage && (
                            <span className="text-[11px] font-medium text-cobalt">
                                {statusMessage}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating || bulletInput.trim().length < 5}
                            className="primary-button ml-auto !px-4 !py-2.5 text-[11px]"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-paper border-t-transparent" />
                                    <span>Generating STAR Variants...</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="sparkle" size={13} />
                                    <span>Transform with AI (STAR Method)</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Generated results */}
            {currentResult && (
                <div className="flex flex-col gap-4">
                    {/* Critique */}
                    {currentResult.critique && (
                        <div className="flex items-start gap-3 border border-rule border-l-2 border-l-ochre bg-amber-50/70 px-4 py-3">
                            <span className="mt-0.5 shrink-0 text-amber-800">
                                <Icon name="search" size={13} />
                            </span>
                            <div className="text-[11px] text-amber-950">
                                <h4 className="mb-0.5 text-[11px] font-semibold text-amber-900">Recruiter Critique</h4>
                                <p className="leading-relaxed">{currentResult.critique}</p>
                            </div>
                        </div>
                    )}

                    {/* Variants */}
                    <div className="flex flex-col gap-3">
                        {Array.isArray(currentResult.variants) && currentResult.variants.map((variant, idx) => {
                            if (!variant) return null;
                            const isCopied = copiedId === variant.id;
                            const isBreakdownOpen = !!expandedBreakdowns[variant.id];
                            const breakdown = variant.starBreakdown || ({} as Partial<typeof variant.starBreakdown>);

                            return (
                                <div
                                    key={variant.id || idx}
                                    className="flex flex-col gap-3 border border-rule bg-surface p-4 sm:p-5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-5 w-5 items-center justify-center border border-rule bg-paper text-[10px] font-semibold tabular-nums text-cobalt">
                                                {idx + 1}
                                            </span>
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-2">
                                                {String(variant.type || "variant").replace("-", " ")}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(variant.id, variant.fullBullet)}
                                                className="inline-flex cursor-pointer items-center gap-1 border border-rule bg-paper px-2.5 py-1 text-[10px] font-semibold text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <Icon name="check" size={10} />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon name="copy" size={10} />
                                                        Copy Bullet
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSave(currentResult)}
                                                className="inline-flex cursor-pointer items-center gap-1 border border-cobalt/25 bg-cobalt-wash px-2.5 py-1 text-[10px] font-semibold text-cobalt transition-colors hover:border-cobalt/40"
                                            >
                                                <Icon name="save" size={10} />
                                                Save
                                            </button>
                                        </div>
                                    </div>

                                    {/* Full bullet */}
                                    <div className="border-l-2 border-cobalt bg-paper px-3 py-2.5 text-[12px] font-medium leading-relaxed text-ink">
                                        {variant.fullBullet}
                                    </div>

                                    {/* Explanation */}
                                    {variant.explanation && (
                                        <p className="flex items-start gap-1.5 text-[10px] italic leading-relaxed text-ink-4">
                                            <Icon name="info" size={10} className="mt-0.5 shrink-0" />
                                            {variant.explanation}
                                        </p>
                                    )}

                                    {/* STAR breakdown */}
                                    <div className="pt-0.5">
                                        <button
                                            type="button"
                                            onClick={() => toggleBreakdown(variant.id)}
                                            className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-cobalt transition-colors hover:text-cobalt-deep"
                                        >
                                            <Icon
                                                name={isBreakdownOpen ? "chevron-down" : "chevron-right"}
                                                size={11}
                                            />
                                            <span>{isBreakdownOpen ? "Hide" : "Show"} S-T-A-R Breakdown</span>
                                        </button>

                                        {isBreakdownOpen && (
                                            <div className="mt-2.5 grid grid-cols-1 gap-px border border-rule bg-rule text-[11px] sm:grid-cols-2">
                                                <div className="flex flex-col gap-0.5 bg-surface p-2.5">
                                                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-cobalt">
                                                        Situation
                                                    </span>
                                                    <p className="text-[10px] leading-relaxed text-ink-2">
                                                        {breakdown.situation || "Context established"}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-0.5 bg-surface p-2.5">
                                                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-cobalt">
                                                        Task
                                                    </span>
                                                    <p className="text-[10px] leading-relaxed text-ink-2">
                                                        {breakdown.task || "Operational objective"}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-0.5 bg-surface p-2.5">
                                                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-cobalt">
                                                        Action
                                                    </span>
                                                    <p className="text-[10px] leading-relaxed text-ink-2">
                                                        {breakdown.action || "Technical implementation"}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-0.5 bg-surface p-2.5">
                                                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-cobalt">
                                                        Result
                                                    </span>
                                                    <p className="text-[10px] leading-relaxed text-ink-2">
                                                        {breakdown.result || "Quantifiable outcome"}
                                                    </p>
                                                </div>

                                                {breakdown.metrics &&
                                                    breakdown.metrics.length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-1.5 border-t border-rule bg-surface p-2.5 sm:col-span-2">
                                                            <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                                                                Extrapolated Metrics:
                                                            </span>
                                                            {breakdown.metrics.map((m, mIdx) => (
                                                                <span
                                                                    key={mIdx}
                                                                    className="border border-rule bg-paper px-1.5 py-0.5 font-mono text-[9px] text-cobalt"
                                                                >
                                                                    {m}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Saved rewrites */}
            {savedRewrites.length > 0 && (
                <div className="border border-rule bg-surface">
                    <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
                        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                            <Icon name="files" size={13} className="text-ink-4" />
                            Saved Rewrites ({savedRewrites.length})
                        </h3>
                        <span className="text-[10px] text-ink-4">Stored in Puter KV</span>
                    </div>

                    <div className="divide-y divide-rule">
                        {savedRewrites.map((rewrite, rIdx) => {
                            if (!rewrite) return null;
                            const original = typeof rewrite.originalBullet === "string" ? rewrite.originalBullet : "";
                            const variants = Array.isArray(rewrite.variants) ? rewrite.variants : [];

                            return (
                                <div key={rewrite.id || rIdx} className="flex flex-col gap-2 px-4 py-3 text-[11px]">
                                    <div className="flex items-start justify-between gap-3 text-[10px] text-ink-4">
                                        <span className="italic">
                                            Original: "{original.slice(0, 70)}
                                            {original.length > 70 ? "..." : ""}"
                                        </span>
                                        {onDeleteRewrite && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSavedRewrite(rewrite.id)}
                                                className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[10px] font-medium text-rust transition-colors hover:text-red-700"
                                            >
                                                <Icon name="trash" size={10} />
                                                Delete
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5 pt-0.5">
                                        {variants.map((v, vIdx) => {
                                            if (!v) return null;
                                            const bulletText = typeof v.fullBullet === "string" ? v.fullBullet : "";
                                            return (
                                                <div
                                                    key={v.id || vIdx}
                                                    className="flex items-start justify-between gap-3 border border-rule bg-paper px-2.5 py-2 text-[11px] text-ink-2"
                                                >
                                                    <p className="flex-1 leading-relaxed">
                                                        {bulletText}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(`saved-${rewrite.id}-${v.id}`, bulletText)}
                                                        className="shrink-0 cursor-pointer border border-rule bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-ink-3 transition-colors hover:text-ink"
                                                    >
                                                        {copiedId === `saved-${rewrite.id}-${v.id}` ? (
                                                            <Icon name="check" size={10} />
                                                        ) : (
                                                            "Copy"
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StarRewriterTab;
