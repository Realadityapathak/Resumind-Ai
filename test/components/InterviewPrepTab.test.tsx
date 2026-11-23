import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InterviewPrepTab } from "~/features/interview-prep/InterviewPrepTab";
import { usePuterStore } from "~/services/puter/store";

vi.mock("~/services/puter/store", () => ({
    usePuterStore: vi.fn(),
}));

const mockPrepSection: InterviewPrepSection = {
    id: "prep-test-1",
    roleTitle: "Staff Backend Engineer",
    targetRole: "Staff Backend Engineer",
    companyName: "Stripe",
    generatedAt: new Date().toISOString(),
    questions: [
        {
            id: "q-1",
            category: "behavioral",
            question: "Tell me about a time you led a technical migration with zero downtime.",
            recruiterIntent: "Assesses architectural foresight and migration execution.",
            resumeAnchor: "Anchored to your payments DB migration.",
            starModelAnswer: {
                situation: "Legacy database had connection limits during flash sales.",
                task: "Migrate to CockroachDB without interrupting transactions.",
                action: "Used dual-writing and shadow traffic verification.",
                result: "Completed migration with zero dropped requests and 99.999% uptime.",
                fullAnswer: "When our legacy database hit connection limits, I engineered a dual-writing proxy...",
            },
            pitfallsToAvoid: ["Not testing rollback plans", "Ignoring schema locks"],
            isBookmarked: false,
            userPracticeResponse: "",
        },
        {
            id: "q-2",
            category: "technical",
            question: "How do you design an idempotent payment processing API?",
            recruiterIntent: "Evaluates API design standards and distributed systems consensus.",
            resumeAnchor: "Anchored to your distributed transactions experience.",
            starModelAnswer: {
                situation: "Duplicate network retries caused double-charge risk.",
                task: "Ensure strict idempotency for all charging endpoints.",
                action: "Implemented idempotency keys cached in Redis with distributed locks.",
                result: "Eliminated duplicate transactions completely.",
                fullAnswer: "To guarantee idempotency, we assign unique transaction keys...",
            },
            pitfallsToAvoid: ["Forgetting lock expiration", "Not handling network timeouts"],
            isBookmarked: true,
            userPracticeResponse: "My draft practice response about Redis locking.",
        },
        {
            id: "q-3",
            category: "situational",
            question: "What would you do if a release broke production checkout on Black Friday?",
            recruiterIntent: "Probes high-stress incident command and communication.",
            resumeAnchor: "Anchored to your on-call incident triage.",
            starModelAnswer: {
                situation: "Black Friday checkout spiked 500 errors after deploy.",
                task: "Restore checkout within 5 minutes.",
                action: "Executed canary rollback and initiated incident channel.",
                result: "Restored checkout in 2 minutes 40 seconds.",
                fullAnswer: "In high severity outages, containment is priority one...",
            },
            pitfallsToAvoid: ["Live debugging without rollback", "Ignoring executive updates"],
            isBookmarked: false,
            userPracticeResponse: "",
        },
    ],
};

describe("InterviewPrepTab Component (app/components/workspace/InterviewPrepTab.tsx)", () => {
    let mockChat: any;

    beforeEach(() => {
        mockChat = vi.fn().mockResolvedValue({
            message: {
                content: JSON.stringify({
                    questions: [
                        {
                            id: "q-new-1",
                            category: "technical",
                            question: "How do you manage eventual consistency across microservices?",
                            recruiterIntent: "Tests saga pattern and event-driven architecture.",
                            resumeAnchor: "Anchored to Kafka event streaming.",
                            starModelAnswer: {
                                situation: "Inconsistent state between billing and order fulfillment.",
                                task: "Guarantee reliable eventual consistency.",
                                action: "Implemented transactional outbox pattern with Kafka and Debezium.",
                                result: "Achieved 100% data consistency and eliminated reconciliation jobs.",
                                fullAnswer: "We introduced the transactional outbox pattern...",
                            },
                            pitfallsToAvoid: ["Ignoring duplicate message delivery"],
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

    it("renders the component with header, filter pills, and questions list", () => {
        render(
            <InterviewPrepTab
                resumeId="resume-123"
                jobTitle="Staff Backend Engineer"
                companyName="Stripe"
                initialInterviewPrep={mockPrepSection}
            />
        );

        expect(screen.getByText("Interview Preparation Engine")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^All/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Behavioral/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Technical/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Situational/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Starred/i })).toBeInTheDocument();
        expect(screen.getByText(/Tell me about a time you led a technical migration/i)).toBeInTheDocument();
    });

    it("filters questions when clicking category pills", () => {
        render(
            <InterviewPrepTab
                resumeId="resume-123"
                jobTitle="Staff Backend Engineer"
                companyName="Stripe"
                initialInterviewPrep={mockPrepSection}
            />
        );

        // Click Technical filter pill
        const techPill = screen.getByRole("button", { name: /^Technical/i });
        fireEvent.click(techPill);

        expect(screen.getByText(/How do you design an idempotent payment processing API/i)).toBeInTheDocument();
        expect(screen.queryByText(/Tell me about a time you led a technical migration/i)).not.toBeInTheDocument();

        // Click Starred filter pill
        const starredPill = screen.getByRole("button", { name: /Starred/i });
        fireEvent.click(starredPill);

        expect(screen.getByText(/How do you design an idempotent payment processing API/i)).toBeInTheDocument();
        expect(screen.queryByText(/What would you do if a release broke/i)).not.toBeInTheDocument();
    });

    it("toggles question accordion expansion", () => {
        render(
            <InterviewPrepTab
                resumeId="resume-123"
                jobTitle="Staff Backend Engineer"
                companyName="Stripe"
                initialInterviewPrep={mockPrepSection}
            />
        );

        // Question 1 starts expanded ("q-1" in initial expanded state)
        expect(screen.getByText(/Assesses architectural foresight and migration execution/i)).toBeInTheDocument();

        // Click question 1 expand toggle button to collapse
        const collapseBtn = screen.getByRole("button", { name: /Collapse Question Details/i });
        fireEvent.click(collapseBtn);

        expect(screen.queryByText(/Assesses architectural foresight and migration execution/i)).not.toBeInTheDocument();
    });

    it("expands and collapses all questions via toolbar buttons", () => {
        render(
            <InterviewPrepTab
                resumeId="resume-123"
                jobTitle="Staff Backend Engineer"
                companyName="Stripe"
                initialInterviewPrep={mockPrepSection}
            />
        );

        // Collapse All
        const collapseAllBtn = screen.getByRole("button", { name: /Collapse All/i });
        fireEvent.click(collapseAllBtn);

        expect(screen.queryByText(/Assesses architectural foresight/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Evaluates API design standards/i)).not.toBeInTheDocument();

        // Expand All
        const expandAllBtn = screen.getByRole("button", { name: /Expand All/i });
        fireEvent.click(expandAllBtn);

        expect(screen.getByText(/Assesses architectural foresight/i)).toBeInTheDocument();
        expect(screen.getByText(/Evaluates API design standards/i)).toBeInTheDocument();
    });

    it("toggles bookmark on a question and triggers onSaveInterviewPrep", async () => {
        const onSaveMock = vi.fn().mockResolvedValue(undefined);

        render(
            <InterviewPrepTab
                resumeId="resume-123"
                jobTitle="Staff Backend Engineer"
                companyName="Stripe"
                initialInterviewPrep={mockPrepSection}
                onSaveInterviewPrep={onSaveMock}
            />
        );

        // Question 1 starts unbookmarked
        const bookmarkBtn = screen.getAllByRole("button", { name: /Bookmark for Review/i })[0];
        fireEvent.click(bookmarkBtn);

        await waitFor(() => {
            expect(onSaveMock).toHaveBeenCalledOnce();
            const savedData = onSaveMock.mock.calls[0][0];
            const q1 = savedData.questions.find((q: any) => q.id === "q-1");
            expect(q1.isBookmarked).toBe(true);
        });
    });

    it("copies STAR model answer to clipboard", async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        render(
            <InterviewPrepTab
                resumeId="resume-123"
                jobTitle="Staff Backend Engineer"
                companyName="Stripe"
                initialInterviewPrep={mockPrepSection}
            />
        );

        const copyBtn = screen.getByRole("button", { name: /1-Click Copy STAR Answer/i });
        fireEvent.click(copyBtn);

        await waitFor(() => {
            expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("When our legacy database hit connection limits"));
            expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
        });
    });

    it("saves user practice response in scratchpad and triggers onSaveInterviewPrep", async () => {
        const onSaveMock = vi.fn().mockResolvedValue(undefined);

        render(
            <InterviewPrepTab
                resumeId="resume-123"
                jobTitle="Staff Backend Engineer"
                companyName="Stripe"
                initialInterviewPrep={mockPrepSection}
                onSaveInterviewPrep={onSaveMock}
            />
        );

        const scratchpad = screen.getByPlaceholderText(/Draft your own response here to rehearse/i);
        fireEvent.change(scratchpad, { target: { value: "My personal response: I used blue-green deployments." } });

        const saveDraftBtn = screen.getByRole("button", { name: /Save Draft/i });
        fireEvent.click(saveDraftBtn);

        await waitFor(() => {
            expect(onSaveMock).toHaveBeenCalledOnce();
            const savedData = onSaveMock.mock.calls[0][0];
            const q1 = savedData.questions.find((q: any) => q.id === "q-1");
            expect(q1.userPracticeResponse).toBe("My personal response: I used blue-green deployments.");
        });
    });

    it("generates new questions with AI and triggers onSaveInterviewPrep", async () => {
        const onSaveMock = vi.fn().mockResolvedValue(undefined);

        render(
            <InterviewPrepTab
                resumeId="resume-123"
                jobTitle="Staff Backend Engineer"
                companyName="Stripe"
                parsedText="Staff Backend Engineer with 8 years distributed systems and Kafka streaming."
                onSaveInterviewPrep={onSaveMock}
            />
        );

        const generateBtn = screen.getByRole("button", { name: /Generate 6-8 Questions/i });
        fireEvent.click(generateBtn);

        await waitFor(() => {
            expect(mockChat).toHaveBeenCalledOnce();
            expect(onSaveMock).toHaveBeenCalledOnce();
            expect(screen.getByText(/How do you manage eventual consistency across microservices/i)).toBeInTheDocument();
        });
    });

    it("resiliently loads fallback questions if Puter AI fails", async () => {
        const failingChat = vi.fn().mockRejectedValue(new Error("AI Gateway Offline"));
        (usePuterStore as any).mockImplementation(() => ({
            ai: {
                chat: failingChat,
            },
        }));

        const onSaveMock = vi.fn().mockResolvedValue(undefined);

        render(
            <InterviewPrepTab
                resumeId="resume-123"
                jobTitle="Staff Backend Engineer"
                companyName="Stripe"
                parsedText="Staff Backend Engineer with 8 years distributed systems."
                onSaveInterviewPrep={onSaveMock}
            />
        );

        const generateBtn = screen.getByRole("button", { name: /Generate 6-8 Questions/i });
        fireEvent.click(generateBtn);

        await waitFor(() => {
            expect(failingChat).toHaveBeenCalledOnce();
            expect(onSaveMock).toHaveBeenCalledOnce();
            // Deterministic fallback questions appear, with guidance instead of invented achievements
            expect(screen.getByText(/Tell me about a time you led a technically challenging project/i)).toBeInTheDocument();
            expect(screen.getByText(/Use your own leadership and delivery experience/i)).toBeInTheDocument();
            expect(screen.queryByText(/Our team was tasked with overhauling/i)).not.toBeInTheDocument();
            expect(screen.getByText(/AI service note/i)).toBeInTheDocument();
        });
    });
});
