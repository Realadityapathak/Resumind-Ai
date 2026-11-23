import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AICopilotTab } from "~/features/copilot/AICopilotTab";
import { usePuterStore } from "~/services/puter/store";

vi.mock("~/services/puter/store", () => ({
    usePuterStore: vi.fn(),
}));

const mockFeedback: Feedback = {
    overallScore: 84,
    ATS: { score: 85, tips: [{ type: "good", tip: "Great ATS parse" }] },
    toneAndStyle: { score: 82, tips: [] },
    content: { score: 80, tips: [] },
    structure: { score: 88, tips: [] },
    skills: { score: 85, tips: [] },
};

const mockKeywordAnalysis: KeywordAnalysis = {
    missingCount: 3,
    matchedCount: 7,
    matchRate: 70,
    totalJobKeywords: 10,
    missingKeywords: [
        { keyword: "Kubernetes", category: "tools", frequencyInJob: 3, frequencyInResume: 0, importance: "critical" },
        { keyword: "GraphQL", category: "technical", frequencyInJob: 2, frequencyInResume: 0, importance: "recommended" },
        { keyword: "Kafka", category: "technical", frequencyInJob: 2, frequencyInResume: 0, importance: "critical" },
    ],
    matchedKeywords: [
        { keyword: "TypeScript", category: "technical", frequencyInJob: 4, frequencyInResume: 5, importance: "critical" },
    ],
};

const mockHistory: CopilotMessage[] = [
    {
        id: "msg-1",
        role: "user",
        content: "What are my weakest bullets?",
        timestamp: Date.now() - 60000,
    },
    {
        id: "msg-2",
        role: "assistant",
        content: "Your bullet about payment services lacks quantifiable metrics. Consider rewriting it with the STAR format.",
        timestamp: Date.now() - 50000,
        actionSuggestions: [
            {
                id: "act-star",
                label: "Optimize with STAR",
                actionType: "switch_tab",
                tabTarget: "star",
                payload: "Worked on payment services.",
                icon: "✨",
            },
        ],
    },
];

describe("AICopilotTab Component (app/components/workspace/AICopilotTab.tsx)", () => {
    let mockChat: any;

    beforeEach(() => {
        mockChat = vi.fn().mockResolvedValue({
            message: {
                content: JSON.stringify({
                    reply: "I recommend highlighting your distributed caching experience to bridge the Kafka gap.",
                    actionSuggestions: [
                        {
                            id: "act-keywords",
                            label: "View Missing Keywords",
                            actionType: "switch_tab",
                            tabTarget: "keywords",
                            icon: "🎯",
                        },
                    ],
                }),
            },
        });

        (usePuterStore as any).mockImplementation(() => ({
            ai: {
                chat: mockChat,
            },
        }));
    });

    it("renders context status pill with job title, ATS score, and missing keyword count", () => {
        render(
            <AICopilotTab
                resumeId="resume-123"
                jobTitle="Senior Backend Architect"
                companyName="Stripe"
                feedback={mockFeedback}
                keywordAnalysis={mockKeywordAnalysis}
                onSaveChat={vi.fn().mockResolvedValue(undefined)}
            />
        );

        const statusPill = screen.getByTestId("copilot-context-status");
        expect(statusPill).toHaveTextContent("Resumind Interactive AI Copilot");
        expect(statusPill).toHaveTextContent("Senior Backend Architect");
        expect(statusPill).toHaveTextContent("ATS 84/100");
        expect(statusPill).toHaveTextContent("3 Missing Keywords");
    });

    it("renders initial welcome message and default action suggestions when chatHistory is empty", () => {
        render(
            <AICopilotTab
                resumeId="resume-123"
                jobTitle="Senior Backend Architect"
                companyName="Stripe"
                feedback={mockFeedback}
                keywordAnalysis={mockKeywordAnalysis}
                onSaveChat={vi.fn().mockResolvedValue(undefined)}
            />
        );

        expect(screen.getByText(/Welcome to your Resumind AI Copilot!/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Optimize with STAR/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /View Missing Keywords/i })).toBeInTheDocument();
    });

    it("renders preloaded chat transcript when chatHistory prop is provided", () => {
        render(
            <AICopilotTab
                resumeId="resume-123"
                jobTitle="Senior Backend Architect"
                companyName="Stripe"
                feedback={mockFeedback}
                keywordAnalysis={mockKeywordAnalysis}
                chatHistory={mockHistory}
                onSaveChat={vi.fn().mockResolvedValue(undefined)}
            />
        );

        expect(screen.getByText("What are my weakest bullets?")).toBeInTheDocument();
        expect(screen.getByText(/Your bullet about payment services lacks quantifiable metrics/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Optimize with STAR/i })).toBeInTheDocument();
    });

    it("renders quick prompt chips interpolated with ATS score", () => {
        render(
            <AICopilotTab
                resumeId="resume-123"
                jobTitle="Senior Backend Architect"
                companyName="Stripe"
                feedback={mockFeedback}
                keywordAnalysis={mockKeywordAnalysis}
                onSaveChat={vi.fn().mockResolvedValue(undefined)}
            />
        );

        expect(screen.getByRole("button", { name: "Draft a 3-sentence executive summary" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "How can I boost my ATS score from 84 to 90+?" })).toBeInTheDocument();
    });

    it("clicking a quick prompt chip sends message and triggers onSaveChat", async () => {
        const onSaveChat = vi.fn().mockResolvedValue(undefined);

        render(
            <AICopilotTab
                resumeId="resume-123"
                jobTitle="Senior Backend Architect"
                companyName="Stripe"
                feedback={mockFeedback}
                keywordAnalysis={mockKeywordAnalysis}
                onSaveChat={onSaveChat}
            />
        );

        const chipBtn = screen.getByRole("button", { name: "Draft a 3-sentence executive summary" });
        fireEvent.click(chipBtn);

        await waitFor(() => {
            expect(mockChat).toHaveBeenCalledOnce();
            expect(onSaveChat).toHaveBeenCalled();
            expect(screen.getAllByText("Draft a 3-sentence executive summary").length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText(/I recommend highlighting your distributed caching experience/i)).toBeInTheDocument();
        });
    });

    it("submitting a message via input box sends turn and triggers onSaveChat", async () => {
        const onSaveChat = vi.fn().mockResolvedValue(undefined);

        render(
            <AICopilotTab
                resumeId="resume-123"
                jobTitle="Senior Backend Architect"
                companyName="Stripe"
                feedback={mockFeedback}
                keywordAnalysis={mockKeywordAnalysis}
                onSaveChat={onSaveChat}
            />
        );

        const input = screen.getByPlaceholderText(/Ask Resumind Copilot about your resume/i);
        fireEvent.change(input, { target: { value: "Can you help me rewrite my summary?" } });

        const sendBtn = screen.getByRole("button", { name: /^Send$/i });
        fireEvent.click(sendBtn);

        await waitFor(() => {
            expect(mockChat).toHaveBeenCalledOnce();
            expect(onSaveChat).toHaveBeenCalled();
            expect(screen.getByText("Can you help me rewrite my summary?")).toBeInTheDocument();
            expect(screen.getByText(/I recommend highlighting your distributed caching experience/i)).toBeInTheDocument();
        });
    });

    it("Action Engine Bridge: clicking suggestion button invokes onNavigateTab", () => {
        const onNavigateTab = vi.fn();

        render(
            <AICopilotTab
                resumeId="resume-123"
                jobTitle="Senior Backend Architect"
                companyName="Stripe"
                feedback={mockFeedback}
                keywordAnalysis={mockKeywordAnalysis}
                chatHistory={mockHistory}
                onSaveChat={vi.fn().mockResolvedValue(undefined)}
                onNavigateTab={onNavigateTab}
            />
        );

        const actionBtn = screen.getByRole("button", { name: /Optimize with STAR/i });
        fireEvent.click(actionBtn);

        expect(onNavigateTab).toHaveBeenCalledWith("star", "Worked on payment services.");
    });

    it("Action Engine Bridge: clicking copy suggestion copies text to clipboard", async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        const historyWithCopy: CopilotMessage[] = [
            {
                id: "msg-copy",
                role: "assistant",
                content: "Here is your summary:",
                timestamp: Date.now(),
                actionSuggestions: [
                    {
                        id: "act-copy",
                        label: "Copy Summary",
                        actionType: "copy_text",
                        payload: "Staff engineer with 10 years experience building financial platforms.",
                        icon: "📋",
                    },
                ],
            },
        ];

        render(
            <AICopilotTab
                resumeId="resume-123"
                jobTitle="Senior Backend Architect"
                companyName="Stripe"
                feedback={mockFeedback}
                keywordAnalysis={mockKeywordAnalysis}
                chatHistory={historyWithCopy}
                onSaveChat={vi.fn().mockResolvedValue(undefined)}
            />
        );

        const copyBtn = screen.getByRole("button", { name: /Copy Summary/i });
        fireEvent.click(copyBtn);

        await waitFor(() => {
            expect(writeTextMock).toHaveBeenCalledWith("Staff engineer with 10 years experience building financial platforms.");
            expect(screen.getByText(/✓ Copied/i)).toBeInTheDocument();
        });
    });

    it("clears chat history when clicking trash button", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        const onSaveChat = vi.fn().mockResolvedValue(undefined);

        render(
            <AICopilotTab
                resumeId="resume-123"
                jobTitle="Senior Backend Architect"
                companyName="Stripe"
                feedback={mockFeedback}
                keywordAnalysis={mockKeywordAnalysis}
                chatHistory={mockHistory}
                onSaveChat={onSaveChat}
            />
        );

        const clearBtn = screen.getByRole("button", { name: /Clear chat history/i });
        fireEvent.click(clearBtn);

        await waitFor(() => {
            expect(onSaveChat).toHaveBeenCalledWith([]);
            expect(screen.queryByText("What are my weakest bullets?")).not.toBeInTheDocument();
        });
    });

    it("handles AI error gracefully and adds error message to transcript", async () => {
        const failingChat = vi.fn().mockRejectedValue(new Error("AI Network Timeout"));
        (usePuterStore as any).mockImplementation(() => ({
            ai: {
                chat: failingChat,
            },
        }));

        const onSaveChat = vi.fn().mockResolvedValue(undefined);

        render(
            <AICopilotTab
                resumeId="resume-123"
                jobTitle="Senior Backend Architect"
                companyName="Stripe"
                feedback={mockFeedback}
                keywordAnalysis={mockKeywordAnalysis}
                onSaveChat={onSaveChat}
            />
        );

        const input = screen.getByPlaceholderText(/Ask Resumind Copilot about your resume/i);
        fireEvent.change(input, { target: { value: "Test error inquiry" } });

        const sendBtn = screen.getByRole("button", { name: /^Send$/i });
        fireEvent.click(sendBtn);

        await waitFor(() => {
            expect(failingChat).toHaveBeenCalledOnce();
            expect(screen.getAllByText(/AI Network Timeout/i).length).toBeGreaterThanOrEqual(1);
            expect(onSaveChat).toHaveBeenCalled();
        });
    });
});
