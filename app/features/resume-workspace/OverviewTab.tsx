import { useMemo, type FC } from "react";
import ScoreGauge from "~/components/ui/ScoreGauge";
import ScoreBadge, { getScoreTier } from "~/components/ui/ScoreBadge";
import Icon from "~/components/ui/Icon";

interface OverviewTabProps {
    feedback: Feedback;
    jobTitle?: string;
    companyName?: string;
    onNavigateTab: (tabId: WorkspaceTabId) => void;
}

const OverviewTab: FC<OverviewTabProps> = ({
    feedback,
    jobTitle,
    companyName,
    onNavigateTab,
}) => {
    const overallScore = feedback?.overallScore ?? 0;
    const tierInfo = getScoreTier(overallScore);

    const categories = [
        {
            id: "toneAndStyle",
            name: "Tone & Style",
            score: feedback?.toneAndStyle?.score ?? 0,
            tips: feedback?.toneAndStyle?.tips ?? [],
        },
        {
            id: "content",
            name: "Content & Impact",
            score: feedback?.content?.score ?? 0,
            tips: feedback?.content?.tips ?? [],
        },
        {
            id: "structure",
            name: "Structure & Layout",
            score: feedback?.structure?.score ?? 0,
            tips: feedback?.structure?.tips ?? [],
        },
        {
            id: "skills",
            name: "Core Skills & Tech",
            score: feedback?.skills?.score ?? 0,
            tips: feedback?.skills?.tips ?? [],
        },
    ];

    // Collect all improve tips across ATS and categories for prioritized action items
    const topActions = useMemo(() => {
        const priorityActionItems: {
            text: string;
            categoryName: string;
            targetTab: WorkspaceTabId;
        }[] = [];

        // Check ATS tips
        (feedback?.ATS?.tips ?? [])
            .filter((tip) => tip && tip.type === "improve" && typeof tip.tip === "string")
            .forEach((tip) => {
                const lower = tip.tip.toLowerCase();
                const targetTab: WorkspaceTabId =
                    lower.includes("keyword") || lower.includes("skill") || lower.includes("match")
                        ? "keywords"
                        : lower.includes("verb") || lower.includes("bullet") || lower.includes("metric") || lower.includes("quantif")
                        ? "star"
                        : "details";

                priorityActionItems.push({
                    text: tip.tip,
                    categoryName: "ATS Optimization",
                    targetTab,
                });
            });

        // Check category tips
        categories.forEach((cat) => {
            cat.tips
                .filter((tip) => tip && tip.type === "improve" && typeof tip.tip === "string")
                .forEach((tip) => {
                    const lower = `${tip.tip} ${tip.explanation || ""}`.toLowerCase();
                    const targetTab: WorkspaceTabId =
                        lower.includes("keyword") || lower.includes("gap")
                            ? "keywords"
                            : lower.includes("star") || lower.includes("bullet") || lower.includes("metric") || lower.includes("verb") || lower.includes("quantif")
                            ? "star"
                            : "details";

                    priorityActionItems.push({
                        text: tip.tip,
                        categoryName: cat.name,
                        targetTab,
                    });
                });
        });

        return priorityActionItems.slice(0, 4);
    }, [feedback]);

    return (
        <div
            id="tabpanel-overview"
            role="tabpanel"
            aria-labelledby="tab-overview"
            className="flex animate-fadeIn flex-col gap-6"
        >
            {/* Verdict sheet */}
            <div className="border border-rule bg-surface">
                <div className="flex flex-col justify-between gap-6 p-5 sm:p-6 md:flex-row md:items-center">
                    <div className="flex flex-col items-start text-left">
                        <div className="flex flex-wrap items-center gap-2">
                            <ScoreBadge score={overallScore} variant="label" />
                            {companyName && (
                                <span className="border border-rule bg-paper px-2 py-0.5 text-[10px] font-medium text-ink-3">
                                    {companyName}
                                </span>
                            )}
                        </div>
                        <h2 className="mt-4 text-[22px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[26px]">
                            {tierInfo.label} — ATS Evaluation
                        </h2>
                        <p className="mt-2 max-w-md text-[12px] leading-[1.75] text-ink-3">
                            {jobTitle ? `Targeting: ${jobTitle}. ` : ""}
                            {overallScore >= 70
                                ? "Your resume shows strong alignment with ATS benchmarks and technical requirements."
                                : overallScore >= 50
                                ? "Solid baseline! Address key missing skills and quantify bullet points to hit 80+."
                                : "Your resume requires targeted structural formatting and keyword improvements to pass ATS screens."}
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-center">
                        <ScoreGauge score={overallScore} />
                        <span className="-mt-2 text-[10px] font-medium text-ink-4">ATS Score</span>
                    </div>
                </div>
            </div>

            {/* Category breakdown ledger */}
            <div>
                <div className="mb-3 flex items-baseline justify-between gap-4">
                    <h3 className="text-[13px] font-semibold text-ink">Category Breakdown</h3>
                    <span className="text-[10px] text-ink-4">Four dimensions</span>
                </div>
                <div className="grid grid-cols-1 gap-px border border-rule bg-rule sm:grid-cols-2">
                    {categories.map((cat) => {
                        const goodCount = cat.tips.filter((t: { type?: string } | null) => t?.type === "good").length;
                        const improveCount = cat.tips.filter((t: { type?: string } | null) => t?.type === "improve").length;

                        return (
                            <div key={cat.id} className="flex flex-col justify-between bg-surface p-4">
                                <div>
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <span className="text-[12px] font-semibold text-ink">
                                            {cat.name}
                                        </span>
                                        <span className="text-[11px] font-semibold tabular-nums text-ink-2">
                                            {cat.score}/100
                                        </span>
                                    </div>

                                    {/* Score rule */}
                                    <div className="mb-3 h-[3px] w-full overflow-hidden bg-rule">
                                        <div
                                            className={`h-full transition-all duration-500 ${
                                                cat.score >= 70
                                                    ? "bg-forest"
                                                    : cat.score >= 50
                                                    ? "bg-ochre"
                                                    : "bg-rust"
                                            }`}
                                            style={{ width: `${Math.min(100, Math.max(5, cat.score))}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-2.5 text-[10px] text-ink-3">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 font-medium text-green-700">
                                            <Icon name="check" size={10} />
                                            {goodCount} Strengths
                                        </span>
                                        <span className="text-ink-4">·</span>
                                        <span className="inline-flex items-center gap-1 font-medium text-amber-800">
                                            <Icon name="alert" size={10} />
                                            {improveCount} To Fix
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onNavigateTab("details")}
                                        className="inline-flex cursor-pointer items-center gap-1 font-semibold text-cobalt transition-colors hover:text-cobalt-deep"
                                    >
                                        Details
                                        <Icon name="arrow-right" size={11} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Priority action ledger */}
            {topActions.length > 0 && (
                <div className="border border-rule bg-surface">
                    <div className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Icon name="alert" size={13} className="text-ochre" />
                            <h3 className="text-[13px] font-semibold text-ink">
                                High-Impact Priorities
                            </h3>
                        </div>
                        <span className="text-[10px] tabular-nums text-ink-4">
                            {topActions.length} Recommended Actions
                        </span>
                    </div>

                    <div className="divide-y divide-rule">
                        {topActions.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col items-start justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-rule bg-paper text-[10px] font-semibold tabular-nums text-cobalt">
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <p className="text-[12px] font-medium leading-snug text-ink-2">
                                            {item.text}
                                        </p>
                                        <span className="mt-0.5 block text-[10px] text-ink-4">
                                            From {item.categoryName}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onNavigateTab(item.targetTab)}
                                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 self-end border border-rule bg-paper px-2.5 py-1.5 text-[10px] font-semibold text-cobalt transition-colors hover:border-rule-strong hover:text-cobalt-deep sm:self-auto"
                                >
                                    {item.targetTab === "keywords"
                                        ? "View Keywords"
                                        : item.targetTab === "star"
                                        ? "Rewrite Bullet"
                                        : "Review Deep Dive"}
                                    <Icon name="arrow-right" size={11} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OverviewTab;
