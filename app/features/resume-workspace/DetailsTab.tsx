import type { FC } from "react";
import { Accordion, AccordionItem, AccordionHeader, AccordionContent } from "~/components/ui/Accordion";
import ScoreBadge from "~/components/ui/ScoreBadge";
import Icon from "~/components/ui/Icon";

interface DetailsTabProps {
    feedback: Feedback;
}

const DetailsTab: FC<DetailsTabProps> = ({ feedback }) => {
    const categories = [
        {
            id: "toneAndStyle",
            title: "Tone & Style",
            description: "Tone, voice, clarity, professional presentation and passive vs active voice.",
            score: feedback?.toneAndStyle?.score ?? 0,
            tips: feedback?.toneAndStyle?.tips ?? [],
        },
        {
            id: "content",
            title: "Content & Impact",
            description: "Relevance, substance, quantifiable accomplishments, and business impact.",
            score: feedback?.content?.score ?? 0,
            tips: feedback?.content?.tips ?? [],
        },
        {
            id: "structure",
            title: "Structure & Layout",
            description: "Hierarchy, section organization, chronological flow, and ATS readability.",
            score: feedback?.structure?.score ?? 0,
            tips: feedback?.structure?.tips ?? [],
        },
        {
            id: "skills",
            title: "Skills & Technical Depth",
            description: "Hard technologies, tooling, modern frameworks, and domain expertise alignment.",
            score: feedback?.skills?.score ?? 0,
            tips: feedback?.skills?.tips ?? [],
        },
    ];

    // The first two checks are legacy unconditional passes, not feedback-derived results.
    const atsChecklist = [
        {
            title: "Standard Section Headings",
            desc: "Uses conventional titles (Experience, Education, Skills) recognized by ATS parsers.",
            passed: true,
        },
        {
            title: "Parseable Text Layer",
            desc: "Document contains selectable, searchable text rather than flattened image bitmaps.",
            passed: true,
        },
        {
            title: "Clean Contact Details",
            desc: "Standard header containing email, phone number, location, and LinkedIn URL.",
            passed: (feedback?.overallScore ?? 0) >= 50,
        },
        {
            title: "Quantified Accomplishments",
            desc: "Experience bullets incorporate measurable percentages, dollars, or performance metrics.",
            passed: (feedback?.content?.score ?? 0) >= 70,
        },
        {
            title: "Single-Column Layout Discipline",
            desc: "Avoids complex multi-column floating boxes or nested tables that confuse ATS readers.",
            passed: (feedback?.structure?.score ?? 0) >= 60,
        },
    ];

    return (
        <div
            id="tabpanel-details"
            role="tabpanel"
            aria-labelledby="tab-details"
            className="flex animate-fadeIn flex-col gap-6"
        >
            {/* Header band */}
            <div className="border border-rule bg-surface px-5 py-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-4">
                    Full diagnostic
                </p>
                <h2 className="mt-2 text-[20px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[23px]">
                    Comprehensive Quality Breakdown
                </h2>
                <p className="mt-2 max-w-xl text-[12px] leading-[1.75] text-ink-3">
                    Expand each dimension below to inspect specific strengths and concrete action items provided by Gemini AI.
                </p>
            </div>

            {/* Accordion ledger */}
            <div className="border border-rule bg-surface">
                <Accordion defaultOpen="toneAndStyle" allowMultiple={true}>
                    {categories.map((category) => {
                        const goodTips = category.tips.filter((tip) => tip && tip.type === "good");
                        const improveTips = category.tips.filter((tip) => tip && tip.type === "improve");

                        return (
                            <AccordionItem key={category.id} id={category.id} className="last:border-b-0">
                                <AccordionHeader itemId={category.id} className="px-4 py-4 hover:bg-surface-2 sm:px-5">
                                    <div className="flex w-full items-center justify-between gap-4 pr-2">
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                                            <span className="text-[13px] font-semibold text-ink">
                                                {category.title}
                                            </span>
                                            <span className="hidden text-[10px] text-ink-4 sm:inline">
                                                {category.tips.length} observations
                                            </span>
                                        </div>
                                        <ScoreBadge score={category.score} variant="score" />
                                    </div>
                                </AccordionHeader>
                                <AccordionContent itemId={category.id} className="bg-surface-2 px-4 pb-5 pt-1 sm:px-5">
                                    <p className="mb-4 text-[11px] leading-relaxed text-ink-3">{category.description}</p>

                                    <div className="grid grid-cols-1 gap-px border border-rule bg-rule md:grid-cols-2">
                                        {/* Strengths Column */}
                                        <div className="flex flex-col gap-2.5 bg-surface p-3.5">
                                            <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-green-700">
                                                <Icon name="check" size={11} />
                                                Strengths ({goodTips.length})
                                            </h4>
                                            {goodTips.length === 0 ? (
                                                <div className="border border-rule bg-paper p-3 text-[11px] text-ink-3">
                                                    No specific strengths recorded in this section.
                                                </div>
                                            ) : (
                                                goodTips.map((tip, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex flex-col gap-1 border-l-2 border-forest bg-green-50/60 px-3 py-2"
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <span className="mt-0.5 shrink-0 text-green-700">
                                                                <Icon name="check" size={11} />
                                                            </span>
                                                            <p className="text-[11px] font-semibold leading-snug text-green-900">
                                                                {tip.tip}
                                                            </p>
                                                        </div>
                                                        {tip.explanation && (
                                                            <p className="pl-4 text-[10px] leading-relaxed text-green-800/90">
                                                                {tip.explanation}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Improvements Column */}
                                        <div className="flex flex-col gap-2.5 bg-surface p-3.5">
                                            <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-800">
                                                <Icon name="alert" size={11} />
                                                Recommended Fixes ({improveTips.length})
                                            </h4>
                                            {improveTips.length === 0 ? (
                                                <div className="border border-rule bg-paper p-3 text-[11px] text-ink-3">
                                                    No critical fixes needed in this category!
                                                </div>
                                            ) : (
                                                improveTips.map((tip, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex flex-col gap-1 border-l-2 border-ochre bg-amber-50/60 px-3 py-2"
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <span className="mt-0.5 shrink-0 text-amber-800">
                                                                <Icon name="alert" size={11} />
                                                            </span>
                                                            <p className="text-[11px] font-semibold leading-snug text-amber-900">
                                                                {tip.tip}
                                                            </p>
                                                        </div>
                                                        {tip.explanation && (
                                                            <p className="pl-4 text-[10px] leading-relaxed text-amber-900/90">
                                                                {tip.explanation}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            </div>

            {/* ATS hygiene checklist */}
            <div className="border border-rule bg-surface">
                <div className="flex items-start gap-2.5 border-b border-rule px-4 py-3.5 sm:px-5">
                    <span className="mt-0.5 text-cobalt">
                        <Icon name="shield" size={14} />
                    </span>
                    <div>
                        <h3 className="text-[13px] font-semibold text-ink">
                            ATS Formatting &amp; Hygiene Checklist
                        </h3>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-ink-4">
                            Essential requirements verified for modern parsing engines (Workday, Greenhouse, Lever).
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-px bg-rule sm:grid-cols-2">
                    {atsChecklist.map((item, idx: number) => (
                        <div
                            key={idx}
                            className="flex items-start gap-3 bg-surface px-4 py-3.5 transition-colors hover:bg-surface-2"
                        >
                            <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] font-semibold ${
                                    item.passed
                                        ? "border-green-200 bg-green-50 text-green-700"
                                        : "border-amber-200 bg-amber-50 text-amber-800"
                                }`}
                            >
                                {item.passed ? <Icon name="check" size={11} /> : "!"}
                            </span>
                            <div>
                                <h4
                                    className={`text-[11px] font-semibold ${
                                        item.passed ? "text-green-900" : "text-amber-900"
                                    }`}
                                >
                                    {item.title}
                                </h4>
                                <p className="mt-0.5 text-[10px] leading-relaxed text-ink-3">
                                    {item.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DetailsTab;
