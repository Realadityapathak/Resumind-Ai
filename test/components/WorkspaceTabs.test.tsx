import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WorkspaceTabs from "~/features/resume-workspace/WorkspaceTabs";

const mockFeedback: Feedback = {
    overallScore: 84,
    ATS: {
        score: 85,
        tips: [{ type: "good", tip: "Clean ATS headers." }],
    },
    toneAndStyle: {
        score: 80,
        tips: [{ type: "good", tip: "Active voice.", explanation: "Good tone." }],
    },
    content: {
        score: 85,
        tips: [{ type: "improve", tip: "Quantify metrics.", explanation: "Add percentages." }],
    },
    structure: {
        score: 90,
        tips: [{ type: "good", tip: "Logical layout.", explanation: "Easy to parse." }],
    },
    skills: {
        score: 78,
        tips: [{ type: "improve", tip: "Include cloud tools.", explanation: "Add AWS." }],
    },
};

const mockKeywordAnalysis: KeywordAnalysis = {
    matchRate: 75,
    totalJobKeywords: 8,
    matchedCount: 6,
    missingCount: 2,
    matchedKeywords: [],
    missingKeywords: [],
};

describe("<WorkspaceTabs /> Component", () => {
    it("renders all 7 tabs with their labels and accessibility attributes", () => {
        const onTabChange = vi.fn();
        render(
            <WorkspaceTabs
                activeTab="overview"
                onTabChange={onTabChange}
                feedback={mockFeedback}
            />
        );

        expect(screen.getByRole("tablist")).toBeInTheDocument();

        const tabs = screen.getAllByRole("tab");
        expect(tabs.length).toBe(7);

        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Deep Dive")).toBeInTheDocument();
        expect(screen.getByText("Keyword Gap")).toBeInTheDocument();
        expect(screen.getByText("STAR Rewriter")).toBeInTheDocument();
        expect(screen.getByText("Cover Letter")).toBeInTheDocument();
        expect(screen.getByText("Interview Prep")).toBeInTheDocument();
        expect(screen.getByText("AI Copilot")).toBeInTheDocument();
    });

    it("marks active tab with aria-selected='true' and others with aria-selected='false'", () => {
        const onTabChange = vi.fn();
        render(
            <WorkspaceTabs
                activeTab="keywords"
                onTabChange={onTabChange}
                feedback={mockFeedback}
            />
        );

        const keywordsTab = screen.getByRole("tab", { name: /Keyword Gap/i });
        const overviewTab = screen.getByRole("tab", { name: /Overview/i });

        expect(keywordsTab).toHaveAttribute("aria-selected", "true");
        expect(overviewTab).toHaveAttribute("aria-selected", "false");
    });

    it("calls onTabChange when a tab is clicked", () => {
        const onTabChange = vi.fn();
        render(
            <WorkspaceTabs
                activeTab="overview"
                onTabChange={onTabChange}
                feedback={mockFeedback}
            />
        );

        const starTab = screen.getByRole("tab", { name: /STAR Rewriter/i });
        fireEvent.click(starTab);

        expect(onTabChange).toHaveBeenCalledWith("star");
    });

    it("displays dynamic badges for score, tip count, keyword gap, and saved rewrites", () => {
        const onTabChange = vi.fn();
        render(
            <WorkspaceTabs
                activeTab="overview"
                onTabChange={onTabChange}
                feedback={mockFeedback}
                keywordAnalysis={mockKeywordAnalysis}
                savedStarCount={4}
            />
        );

        // Overall score badge (84/100)
        expect(screen.getByText("84/100")).toBeInTheDocument();

        // Deep dive tips count (5 tips across categories)
        expect(screen.getByText("5 Tips")).toBeInTheDocument();

        // Missing keywords badge
        expect(screen.getByText("2 Missing")).toBeInTheDocument();

        // Saved STAR count
        expect(screen.getByText("4 Saved")).toBeInTheDocument();

        // Default fallback badges
        const readyBadges = screen.getAllByText("Ready");
        expect(readyBadges.length).toBe(3);
    });
});
