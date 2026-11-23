import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import ResumeWorkspace from "~/routes/resume";
import { usePuterStore } from "~/services/puter/store";
import { puterMock } from "../mocks/puterMock";

const mockResumeData: Resume = {
    id: "resume-test-123",
    companyName: "Stripe",
    jobTitle: "Senior Full-Stack Engineer",
    jobDescription: "Must have experience with React, TypeScript, and distributed systems.",
    imagePath: "resumes/test_page_1.png",
    imagePaths: ["resumes/test_page_1.png", "resumes/test_page_2.png"],
    resumePath: "resumes/test_resume.pdf",
    parsedText: "Jane Doe Senior Full-Stack Engineer with 7 years of React and TypeScript experience. Built high-scale financial infrastructure.",
    pageCount: 2,
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
    savedStarRewrites: [
        {
            id: "rewrite-1",
            originalBullet: "Worked on payments platform.",
            toneFocus: "action-oriented",
            critique: "Needed metrics.",
            variants: [
                {
                    id: "v1",
                    type: "action-oriented",
                    fullBullet: "Spearheaded payments integration processing $12M daily.",
                    starBreakdown: {
                        situation: "High failure rate.",
                        task: "Reduce dropoff.",
                        action: "Integrated Stripe Elements.",
                        result: "Processed $12M daily.",
                        metrics: ["$12M"],
                    },
                    explanation: "Strong metrics.",
                },
            ],
            createdAt: "2026-11-08T08:00:00Z",
        },
    ],
};

describe("Dual-Pane Resume Workspace Route (app/routes/resume.tsx)", () => {
    beforeAll(() => {
        if (typeof SVGElement !== "undefined" && !(SVGElement.prototype as any).getTotalLength) {
            (SVGElement.prototype as any).getTotalLength = () => 125.66;
        }
    });

    beforeEach(() => {
        vi.clearAllMocks();
        puterMock.reset();

        // Seed KV and FS
        puterMock.kvStore.set(`resume:${mockResumeData.id}`, JSON.stringify(mockResumeData));
        puterMock.fsStore.set("resumes/test_resume.pdf", new Blob(["pdf-bytes"], { type: "application/pdf" }));
        puterMock.fsStore.set("resumes/test_page_1.png", new Blob(["img-bytes-1"], { type: "image/png" }));
        puterMock.fsStore.set("resumes/test_page_2.png", new Blob(["img-bytes-2"], { type: "image/png" }));

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

    it("renders dual-pane workspace with header metadata, left PDF previewer, and right workspace tabs", async () => {
        render(
            <MemoryRouter initialEntries={[`/resume/${mockResumeData.id}?tab=overview`]}>
                <Routes>
                    <Route path="/resume/:id" element={<ResumeWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        // Header check
        const jobTitles = await screen.findAllByText(/Senior Full-Stack Engineer/i);
        expect(jobTitles[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Stripe/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/86\/100/i)[0]).toBeInTheDocument();

        // Dual-pane containers
        expect(screen.getByLabelText("Document Preview")).toBeInTheDocument();
        expect(screen.getByLabelText("Resume Evaluation and Tools")).toBeInTheDocument();

        // Left pane: page indicator
        expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

        // Right pane: Overview Tab active
        const overviewPanel = document.getElementById("tabpanel-overview");
        expect(overviewPanel).toBeInTheDocument();
        expect(screen.getByText(/ATS Evaluation/i)).toBeInTheDocument();
    });

    it("navigates across tabs using URL search parameter synchronization", async () => {
        render(
            <MemoryRouter initialEntries={[`/resume/${mockResumeData.id}?tab=details`]}>
                <Routes>
                    <Route path="/resume/:id" element={<ResumeWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        // Details tab should be active
        expect(await screen.findByText(/Comprehensive Quality Breakdown/i)).toBeInTheDocument();
        expect(screen.getByText(/Tone & Style/i)).toBeInTheDocument();

        // Click Keyword Gap tab
        const keywordsTab = screen.getByRole("tab", { name: /Keyword Gap/i });
        fireEvent.click(keywordsTab);

        expect(await screen.findByText(/ATS Keyword Gap Matrix/i)).toBeInTheDocument();

        // Click STAR Rewriter tab
        const starTab = screen.getByRole("tab", { name: /STAR Rewriter/i });
        fireEvent.click(starTab);

        expect(await screen.findByText(/AI STAR Bullet Rewriter/i)).toBeInTheDocument();
    });

    it("defaults invalid tab search parameters safely to 'overview'", async () => {
        render(
            <MemoryRouter initialEntries={[`/resume/${mockResumeData.id}?tab=nonexistent-tab`]}>
                <Routes>
                    <Route path="/resume/:id" element={<ResumeWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        // Expect to fallback to Overview
        expect(await screen.findByText(/ATS Evaluation/i)).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Overview/i })).toHaveAttribute("aria-selected", "true");
    });

    it("renders 'Resume Not Found' state when KV key does not exist", async () => {
        render(
            <MemoryRouter initialEntries={["/resume/missing-uuid-999"]}>
                <Routes>
                    <Route path="/resume/:id" element={<ResumeWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText(/Resume Not Found/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Return to Dashboard/i })).toHaveAttribute("href", "/");
    });

    it("renders Milestone 4 preview tabs cleanly without errors", async () => {
        render(
            <MemoryRouter initialEntries={[`/resume/${mockResumeData.id}?tab=cover-letter`]}>
                <Routes>
                    <Route path="/resume/:id" element={<ResumeWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText(/Tailored AI Cover Letter Generator/i)).toBeInTheDocument();
        expect(screen.getByText(/AI Action Engine/i)).toBeInTheDocument();

        // Switch to Copilot tab
        fireEvent.click(screen.getByRole("tab", { name: /AI Copilot/i }));
        expect(await screen.findByText(/Resumind Interactive AI Copilot/i)).toBeInTheDocument();
    });

    it("revokes created object URLs when workspace unmounts", async () => {
        const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

        const { unmount } = render(
            <MemoryRouter initialEntries={[`/resume/${mockResumeData.id}?tab=overview`]}>
                <Routes>
                    <Route path="/resume/:id" element={<ResumeWorkspace />} />
                </Routes>
            </MemoryRouter>
        );

        await screen.findAllByText(/Senior Full-Stack Engineer/i);

        unmount();

        expect(revokeSpy).toHaveBeenCalled();
    });
});
