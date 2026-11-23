import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import ResumeWorkspace from "~/routes/resume";
import { usePuterStore } from "~/services/puter/store";
import { puterMock } from "../mocks/puterMock";

const mockM4ResumeData: Resume = {
    id: "resume-m4-integration",
    companyName: "Stripe",
    jobTitle: "Senior Full-Stack Engineer",
    jobDescription: "Must have experience with React, TypeScript, and distributed systems.",
    imagePath: "resumes/test_page_1.png",
    imagePaths: ["resumes/test_page_1.png"],
    resumePath: "resumes/test_resume.pdf",
    parsedText: "Jane Doe Senior Full-Stack Engineer with 7 years of React and TypeScript experience. Built high-scale financial infrastructure.",
    pageCount: 1,
    isScanned: false,
    ocrApplied: false,
    fileName: "Jane_Doe_Resume.pdf",
    feedback: {
        overallScore: 86,
        ATS: {
            score: 88,
            tips: [{ type: "good", tip: "Strong ATS structure." }],
        },
        toneAndStyle: {
            score: 85,
            tips: [{ type: "good", tip: "Active voice used.", explanation: "Tone is professional." }],
        },
        content: {
            score: 82,
            tips: [{ type: "improve", tip: "Quantify metrics.", explanation: "Add percentages." }],
        },
        structure: {
            score: 90,
            tips: [{ type: "good", tip: "Logical layout.", explanation: "Clear headings." }],
        },
        skills: {
            score: 84,
            tips: [{ type: "good", tip: "Modern technical stack.", explanation: "Good skills." }],
        },
    },
    coverLetters: [
        {
            id: "cl-seed-1",
            roleTitle: "Senior Full-Stack Engineer",
            jobTitle: "Senior Full-Stack Engineer",
            companyName: "Stripe",
            tone: "professional",
            subjectLine: "Application for Senior Full-Stack Engineer — Jane Doe",
            salutation: "Dear Stripe Engineering Team,",
            hookParagraph: "I am writing to express my strong enthusiasm for joining Stripe.",
            bodyParagraphs: [
                "At my previous company, I spearheaded the frontend architecture for our payments engine.",
                "I also built resilient real-time WebSocket pipelines with 99.99% availability.",
            ],
            closingParagraph: "I welcome the opportunity to discuss my qualifications in detail.",
            signOff: "Sincerely,\nJane Doe",
            fullText: "Application for Senior Full-Stack Engineer — Jane Doe\n\nDear Stripe Engineering Team,\n\nI am writing to express my strong enthusiasm for joining Stripe.\n\nAt my previous company, I spearheaded the frontend architecture for our payments engine.\n\nI also built resilient real-time WebSocket pipelines with 99.99% availability.\n\nI welcome the opportunity to discuss my qualifications in detail.\n\nSincerely,\nJane Doe",
            wordCount: 52,
            readingTimeMinutes: 1,
            createdAt: "2026-11-08T10:00:00Z",
            updatedAt: "2026-11-08T10:00:00Z",
        },
    ],
    interviewPrep: {
        id: "prep-seed-1",
        targetRole: "Senior Full-Stack Engineer",
        companyName: "Stripe",
        generatedAt: "2026-11-08T10:00:00Z",
        questions: [
            {
                id: "q-seed-1",
                category: "behavioral",
                question: "Describe a high-stakes engineering disagreement and how you resolved it.",
                recruiterIntent: "Assesses emotional intelligence and influence without authority.",
                resumeAnchor: "Anchored to your engineering leadership at prior company.",
                starModelAnswer: {
                    situation: "Team was divided between GraphQL and REST for payments.",
                    task: "Align team on a single standard without delaying roadmap.",
                    action: "Built benchmarking POC measuring latency, payload sizes, and caching trade-offs.",
                    result: "Team unanimously chose REST with OpenAPI; shipped on schedule.",
                    fullAnswer: "When our engineering team was divided on API architecture...",
                },
                pitfallsToAvoid: ["Being dogmatic", "Not using empirical benchmarks"],
                isBookmarked: false,
                userPracticeResponse: "",
            },
            {
                id: "q-seed-2",
                category: "technical",
                question: "How do you prevent race conditions in distributed checkout sessions?",
                recruiterIntent: "Tests distributed locking, optimistic concurrency, and database isolation.",
                resumeAnchor: "Anchored to your financial infrastructure experience.",
                starModelAnswer: {
                    situation: "Concurrent checkout webhooks caused inventory over-allocation.",
                    task: "Ensure strict serialization of checkout session states.",
                    action: "Implemented Redis Redlock with idempotency keys and version check.",
                    result: "Reduced inventory conflicts to zero under peak traffic.",
                    fullAnswer: "To prevent race conditions, we enforce idempotency...",
                },
                pitfallsToAvoid: ["Relying on in-memory locks in distributed setup"],
                isBookmarked: true,
                userPracticeResponse: "My practice answer on Redlock.",
            },
        ],
    },
    copilotChat: [
        {
            id: "msg-seed-1",
            role: "user",
            content: "What is my highest leverage improvement?",
            timestamp: Date.now() - 30000,
        },
        {
            id: "msg-seed-2",
            role: "assistant",
            content: "Your highest leverage improvement is adding quantifiable metrics to your payments bullet.",
            timestamp: Date.now() - 20000,
            actionSuggestions: [
                {
                    id: "act-bridge-star",
                    label: "Optimize with STAR",
                    actionType: "switch_tab",
                    tabTarget: "star",
                    payload: "Built high-scale financial infrastructure.",
                    icon: "✨",
                },
            ],
        },
    ],
};

describe("Milestone 4 Integration & Route Verification (app/routes/resume.tsx)", () => {
    beforeAll(() => {
        if (typeof SVGElement !== "undefined" && !(SVGElement.prototype as any).getTotalLength) {
            (SVGElement.prototype as any).getTotalLength = () => 125.66;
        }
    });

    beforeEach(() => {
        vi.clearAllMocks();
        puterMock.reset();

        // Seed KV and FS
        puterMock.kvStore.set(`resume:${mockM4ResumeData.id}`, JSON.stringify(mockM4ResumeData));
        puterMock.fsStore.set("resumes/test_resume.pdf", new Blob(["pdf-bytes"], { type: "application/pdf" }));
        puterMock.fsStore.set("resumes/test_page_1.png", new Blob(["img-bytes-1"], { type: "image/png" }));

        usePuterStore.setState({
            authStatus: "authenticated",
            puterReady: true,
            isLoading: false,
            auth: {
                user: { uuid: "user-1", username: "tester" },
                isAuthenticated: true,
                authStatus: "authenticated",
                signIn: vi.fn(),
                signOut: vi.fn(),
                refreshUser: vi.fn(),
                checkAuthStatus: vi.fn(async () => true),
                getUser: () => ({ uuid: "user-1", username: "tester" }),
            },
            kv: {
                ...puterMock.kv,
                delete: (key: string) => puterMock.kv.del(key),
            },
            fs: puterMock.fs,
            ai: puterMock.ai,
        });
    });

    it("displays dynamic M4 count badges in WorkspaceTabs when data is populated", async () => {
        render(
            <MemoryRouter initialEntries={[`/resume/${mockM4ResumeData.id}?tab=overview`]}>
                <Routes>
                    <Route path="/resume/:id" element={<ResumeWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Senior Full-Stack Engineer")).toBeInTheDocument();
        });

        // Check dynamic count badges
        expect(screen.getByText("1 Saved")).toBeInTheDocument(); // Cover letter badge
        expect(screen.getByText("2 Qs")).toBeInTheDocument();    // Interview prep badge
        expect(screen.getByText("1 Chat")).toBeInTheDocument();  // Copilot user chat count badge
    });

    it("navigates to ?tab=cover-letter, renders CoverLetterTab, and persists edits to Puter KV", async () => {
        render(
            <MemoryRouter initialEntries={[`/resume/${mockM4ResumeData.id}?tab=cover-letter`]}>
                <Routes>
                    <Route path="/resume/:id" element={<ResumeWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Tailored AI Cover Letter Generator")).toBeInTheDocument();
            expect(screen.getByRole("textbox", { name: /Cover Letter Document Editor/i })).toBeInTheDocument();
        });

        // Edit cover letter textarea
        const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i });
        fireEvent.change(textarea, { target: { value: "Updated cover letter content via integration test." } });

        // Click Save Draft
        const saveDraftBtn = screen.getByRole("button", { name: /Save Draft/i });
        fireEvent.click(saveDraftBtn);

        await waitFor(async () => {
            const raw = await puterMock.kv.get(`resume:${mockM4ResumeData.id}`);
            const parsed = JSON.parse(raw!);
            expect(parsed.coverLetters[0].fullText).toBe("Updated cover letter content via integration test.");
        });
    });

    it("navigates to ?tab=interview-prep, toggles a bookmark, and atomically updates Puter KV", async () => {
        render(
            <MemoryRouter initialEntries={[`/resume/${mockM4ResumeData.id}?tab=interview-prep`]}>
                <Routes>
                    <Route path="/resume/:id" element={<ResumeWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Interview Preparation Engine")).toBeInTheDocument();
            expect(screen.getByText(/Describe a high-stakes engineering disagreement/i)).toBeInTheDocument();
        });

        // Question 1 starts unbookmarked: click bookmark button
        const bookmarkBtn = screen.getAllByRole("button", { name: /Bookmark for Review/i })[0];
        fireEvent.click(bookmarkBtn);

        await waitFor(async () => {
            const raw = await puterMock.kv.get(`resume:${mockM4ResumeData.id}`);
            const parsed = JSON.parse(raw!);
            expect(parsed.interviewPrep.questions[0].isBookmarked).toBe(true);
        });
    });

    it("navigates to ?tab=copilot, sends a message, and persists chat transcript to Puter KV", async () => {
        render(
            <MemoryRouter initialEntries={[`/resume/${mockM4ResumeData.id}?tab=copilot`]}>
                <Routes>
                    <Route path="/resume/:id" element={<ResumeWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("What is my highest leverage improvement?")).toBeInTheDocument();
            expect(screen.getByText(/Your highest leverage improvement is adding quantifiable metrics/i)).toBeInTheDocument();
        });

        // Type a new message
        const input = screen.getByPlaceholderText(/Ask Resumind Copilot about your resume/i);
        fireEvent.change(input, { target: { value: "Can you draft an executive summary?" } });

        const sendBtn = screen.getByRole("button", { name: /^Send$/i });
        fireEvent.click(sendBtn);

        await waitFor(async () => {
            const raw = await puterMock.kv.get(`resume:${mockM4ResumeData.id}`);
            const parsed = JSON.parse(raw!);
            expect(parsed.copilotChat.length).toBeGreaterThanOrEqual(3);
            const userMsg = parsed.copilotChat.find(
                (message: CopilotMessage) => message.content === "Can you draft an executive summary?"
            );
            expect(userMsg).toBeDefined();
        });
    });

    it("Action Engine Bridge: clicking suggestion button in Copilot switches tab to STAR rewriter", async () => {
        render(
            <MemoryRouter initialEntries={[`/resume/${mockM4ResumeData.id}?tab=copilot`]}>
                <Routes>
                    <Route path="/resume/:id" element={<ResumeWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Optimize with STAR/i })).toBeInTheDocument();
        });

        const starBridgeBtn = screen.getByRole("button", { name: /Optimize with STAR/i });
        fireEvent.click(starBridgeBtn);

        // Should switch active tab to STAR Bullet Rewriter
        await waitFor(() => {
            expect(screen.getByText(/AI STAR Bullet Rewriter/i)).toBeInTheDocument();
        });
    });
});
