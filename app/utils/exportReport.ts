import { getScoreTier } from "~/components/ui/ScoreBadge";

/**
 * Generates a structured Markdown report from a Resume evaluation.
 */
export function generateMarkdownReport(resume: Resume): string {
    const feedback = resume.feedback;
    const overallScore = feedback?.overallScore ?? 0;
    const tier = getScoreTier(overallScore);

    const company = resume.companyName || "General application";
    const jobTitle = resume.jobTitle || "Resume Workspace";
    const fileName = resume.fileName || "resume.pdf";

    let dateStr = "";
    if (resume.createdAt) {
        try {
            const parsed = new Date(resume.createdAt);
            if (!isNaN(parsed.getTime())) {
                dateStr = parsed.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                });
            }
        } catch {
            // fallback to current date
        }
    }
    if (!dateStr) {
        dateStr = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    const lines: string[] = [];

    // Header info
    lines.push("# ATS Diagnostic & Evaluation Summary Report");
    lines.push("");
    lines.push("## Evaluation Details");
    lines.push(`- **Company Target:** ${company}`);
    lines.push(`- **Target Role:** ${jobTitle}`);
    lines.push(`- **Evaluation Date:** ${dateStr}`);
    lines.push(`- **Source Document:** ${fileName}`);
    if (resume.pageCount) {
        lines.push(`- **Page Count:** ${resume.pageCount}`);
    }
    lines.push("");

    // Overall ATS Score
    lines.push("## Overall ATS Score");
    lines.push(`- **Score:** ${overallScore} / 100`);
    lines.push(`- **Grade Tier:** ${tier.label} (${tier.tier.toUpperCase()})`);
    lines.push("");

    // Category Score Breakdown
    lines.push("## Category Score Breakdown");
    lines.push(`- **Content & Impact:** ${feedback?.content?.score ?? "N/A"}/100`);
    lines.push(`- **Structure & Layout:** ${feedback?.structure?.score ?? "N/A"}/100`);
    lines.push(`- **Core Skills & Tech:** ${feedback?.skills?.score ?? "N/A"}/100`);
    lines.push(`- **Tone & Style:** ${feedback?.toneAndStyle?.score ?? "N/A"}/100`);
    lines.push(`- **ATS Parsability:** ${feedback?.ATS?.score ?? "N/A"}/100`);
    lines.push("");

    // Strengths
    const strengths: string[] = [];
    if (feedback) {
        const categories: { name: string; tips?: { type: string; tip: string }[] }[] = [
            { name: "ATS Parsability", tips: feedback.ATS?.tips },
            { name: "Content", tips: feedback.content?.tips },
            { name: "Structure", tips: feedback.structure?.tips },
            { name: "Skills", tips: feedback.skills?.tips },
            { name: "Tone & Style", tips: feedback.toneAndStyle?.tips },
        ];

        for (const cat of categories) {
            if (Array.isArray(cat.tips)) {
                for (const t of cat.tips) {
                    if (t?.type === "good" && t.tip?.trim()) {
                        strengths.push(`- **[${cat.name}]** ${t.tip.trim()}`);
                    }
                }
            }
        }
    }

    lines.push("## Top Strengths");
    if (strengths.length > 0) {
        lines.push(...strengths);
    } else {
        lines.push("- No specific strengths recorded.");
    }
    lines.push("");

    // Prioritized Improvement Tips
    const improvementTips: string[] = [];
    if (feedback) {
        const categories: {
            name: string;
            tips?: { type: string; tip: string; explanation?: string }[];
        }[] = [
            { name: "ATS Parsability", tips: feedback.ATS?.tips },
            { name: "Content", tips: feedback.content?.tips },
            { name: "Structure", tips: feedback.structure?.tips },
            { name: "Skills", tips: feedback.skills?.tips },
            { name: "Tone & Style", tips: feedback.toneAndStyle?.tips },
        ];

        for (const cat of categories) {
            if (Array.isArray(cat.tips)) {
                for (const t of cat.tips) {
                    if (t?.type === "improve" && t.tip?.trim()) {
                        let entry = `- **[${cat.name}]** ${t.tip.trim()}`;
                        if (t.explanation?.trim()) {
                            entry += ` — *${t.explanation.trim()}*`;
                        }
                        improvementTips.push(entry);
                    }
                }
            }
        }
    }

    lines.push("## Prioritized Improvement Tips");
    if (improvementTips.length > 0) {
        lines.push(...improvementTips);
    } else {
        lines.push("- No improvement recommendations generated.");
    }
    lines.push("");

    // Keyword Analysis
    if (resume.keywordAnalysis) {
        const kw = resume.keywordAnalysis;
        lines.push("## Keyword Gap Analysis");
        lines.push(`- **Match Rate:** ${kw.matchRate}%`);
        lines.push(`- **Matched Keywords Count:** ${kw.matchedCount} / ${kw.totalJobKeywords}`);
        lines.push(`- **Missing Keywords Count:** ${kw.missingCount}`);
        lines.push("");

        lines.push("### Matched Keywords");
        if (Array.isArray(kw.matchedKeywords) && kw.matchedKeywords.length > 0) {
            for (const item of kw.matchedKeywords) {
                if (typeof item === "string") {
                    lines.push(`- **${item}**`);
                } else if (item && typeof item === "object") {
                    const details: string[] = [];
                    if (item.category) details.push(`Category: ${item.category}`);
                    if (item.importance) details.push(`Importance: ${item.importance}`);
                    if (item.frequencyInResume !== undefined) details.push(`Resume freq: ${item.frequencyInResume}`);
                    if (item.frequencyInJob !== undefined) details.push(`Job freq: ${item.frequencyInJob}`);
                    const detailStr = details.length > 0 ? ` (${details.join(", ")})` : "";
                    lines.push(`- **${item.keyword || "Keyword"}**${detailStr}`);
                }
            }
        } else {
            lines.push("- None");
        }
        lines.push("");

        lines.push("### Missing Keywords");
        if (Array.isArray(kw.missingKeywords) && kw.missingKeywords.length > 0) {
            for (const item of kw.missingKeywords) {
                if (typeof item === "string") {
                    lines.push(`- **${item}**`);
                } else if (item && typeof item === "object") {
                    const details: string[] = [];
                    if (item.category) details.push(`Category: ${item.category}`);
                    if (item.importance) details.push(`Importance: ${item.importance}`);
                    if (item.frequencyInJob !== undefined) details.push(`Job freq: ${item.frequencyInJob}`);
                    const detailStr = details.length > 0 ? ` (${details.join(", ")})` : "";
                    let entry = `- **${item.keyword || "Keyword"}**${detailStr}`;
                    if (item.contextOrSuggestion) {
                        entry += ` — *Suggestion: ${item.contextOrSuggestion}*`;
                    }
                    lines.push(entry);
                }
            }
        } else {
            lines.push("- None");
        }
        lines.push("");

        if (Array.isArray(kw.topRecommendations) && kw.topRecommendations.length > 0) {
            lines.push("### Keyword Recommendations");
            for (const rec of kw.topRecommendations) {
                lines.push(`- ${rec}`);
            }
            lines.push("");
        }
    }

    lines.push("---");
    lines.push("*Generated by Resumind AI Resume Analyzer*");

    return lines.join("\n");
}

/**
 * Downloads the evaluation summary report as a Markdown (.md) file
 * with guaranteed URL.revokeObjectURL cleanup.
 */
export function exportEvaluationReport(resume: Resume): void {
    if (typeof document === "undefined" || !document.body || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        return;
    }

    const markdown = generateMarkdownReport(resume);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const safeBaseName = (resume.jobTitle || resume.companyName || "resume-evaluation")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const filename = `${safeBaseName || "resume"}-evaluation-report.md`;

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);

    try {
        anchor.click();
    } finally {
        if (anchor.parentNode) {
            anchor.parentNode.removeChild(anchor);
        }
        // Guaranteed cleanup of Object URL
        setTimeout(() => {
            try {
                URL.revokeObjectURL(url);
            } catch {
                // Ignore cleanup errors
            }
        }, 1000);
    }
}
