import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import {
    validateInterviewQuestions,
    getDefaultInterviewQuestions,
    generateInterviewPrep,
} from "~/features/interview-prep/interviewPrepEngine";
import {
    validateCopilotResponse,
    executeCopilotTurn,
} from "~/features/copilot/copilotEngine";
import { InterviewPrepTab } from "~/features/interview-prep/InterviewPrepTab";
import { AICopilotTab } from "~/features/copilot/AICopilotTab";
import { usePuterStore } from "~/services/puter/store";

vi.mock("~/services/puter/store", () => ({
    usePuterStore: vi.fn(),
}));

const mockBaseFeedback: Feedback = {
    overallScore: 78,
    ATS: { score: 80, tips: [{ type: "good", tip: "Strong keywords" }] },
    toneAndStyle: { score: 75, tips: [] },
    content: { score: 72, tips: [] },
    structure: { score: 82, tips: [] },
    skills: { score: 79, tips: [] },
};

const mockBaseKeywordAnalysis: KeywordAnalysis = {
    missingCount: 2,
    matchedCount: 8,
    matchRate: 80,
    totalJobKeywords: 10,
    missingKeywords: [
        { keyword: "Kubernetes", category: "tools", frequencyInJob: 3, frequencyInResume: 0, importance: "critical" },
        { keyword: "Terraform", category: "tools", frequencyInJob: 2, frequencyInResume: 0, importance: "critical" },
    ],
    matchedKeywords: [],
};

describe("M4 Challenger-2 Adversarial & Empirical Stress Test Suite", () => {
    let mockChat: any;

    beforeAll(() => {
        // Polyfill SVG getTotalLength if necessary in jsdom
        if (typeof SVGElement !== "undefined" && !(SVGElement.prototype as any).getTotalLength) {
            (SVGElement.prototype as any).getTotalLength = () => 100;
        }
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockChat = vi.fn().mockResolvedValue({
            message: {
                content: JSON.stringify({
                    reply: "Default mock copilot response with STAR recommendations.",
                    actionSuggestions: [
                        {
                            id: "mock-star",
                            label: "Optimize with STAR",
                            actionType: "switch_tab",
                            tabTarget: "star",
                            payload: "Drafted bullet",
                            icon: "✨",
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

    // =========================================================================
    // 1. Malformed / Truncated AI Outputs for Interview Questions & STAR
    // =========================================================================
    describe("1. Malformed / Truncated AI Outputs & Edge Cases (Interview Prep Engine)", () => {
        it("validateInterviewQuestions rejects null, non-objects, and empty collections", () => {
            expect(validateInterviewQuestions(null)).toBe(false);
            expect(validateInterviewQuestions(undefined)).toBe(false);
            expect(validateInterviewQuestions("string")).toBe(false);
            expect(validateInterviewQuestions(12345)).toBe(false);
            expect(validateInterviewQuestions({})).toBe(false);
            expect(validateInterviewQuestions({ questions: [] })).toBe(false);
            expect(validateInterviewQuestions({ questions: "not an array" })).toBe(false);
        });

        it("validateInterviewQuestions rejects questions with nulls, primitives, or missing required keys", () => {
            // Null or primitive in questions array
            expect(validateInterviewQuestions({ questions: [null] })).toBe(false);
            expect(validateInterviewQuestions({ questions: [undefined] })).toBe(false);
            expect(validateInterviewQuestions({ questions: ["just a string"] })).toBe(false);
            expect(validateInterviewQuestions({ questions: [100] })).toBe(false);

            // Question missing question text or empty question
            expect(validateInterviewQuestions({
                questions: [{ recruiterIntent: "evaluates leadership", starModelAnswer: {} }]
            })).toBe(false);
            expect(validateInterviewQuestions({
                questions: [{ question: "   ", recruiterIntent: "evaluates leadership", starModelAnswer: {} }]
            })).toBe(false);

            // Question missing both recruiterIntent and interviewerIntent
            expect(validateInterviewQuestions({
                questions: [{ question: "How do you scale DBs?", starModelAnswer: {} }]
            })).toBe(false);

            // Question missing starModelAnswer or starModelAnswer is null/primitive
            expect(validateInterviewQuestions({
                questions: [{ question: "How do you scale DBs?", recruiterIntent: "Intent" }]
            })).toBe(false);
            expect(validateInterviewQuestions({
                questions: [{ question: "How do you scale DBs?", recruiterIntent: "Intent", starModelAnswer: null }]
            })).toBe(false);
            expect(validateInterviewQuestions({
                questions: [{ question: "How do you scale DBs?", recruiterIntent: "Intent", starModelAnswer: "invalid" }]
            })).toBe(false);
        });

        it("validateInterviewQuestions accepts interviewerIntent as valid alias for recruiterIntent", () => {
            const validWithAlias = {
                questions: [
                    {
                        question: "Tell me about a time you resolved a conflict.",
                        interviewerIntent: "Probes emotional intelligence and conflict de-escalation.",
                        starModelAnswer: {
                            situation: "Disagreement on architecture.",
                            task: "Align team on direction.",
                            action: "Conducted spike.",
                            result: "Consensus reached.",
                        },
                    },
                ],
            };
            expect(validateInterviewQuestions(validWithAlias)).toBe(true);
        });

        it("generateInterviewPrep throws clear error when resumeText is under 50 characters", async () => {
            const shortText = "Under 50 chars resume.";
            expect(shortText.length).toBeLessThan(50);

            await expect(
                generateInterviewPrep(mockChat, {
                    resumeText: shortText,
                    jobTitle: "Software Engineer",
                })
            ).rejects.toThrow(/Resume content is too short to generate tailored interview questions/i);

            expect(mockChat).not.toHaveBeenCalled();
        });

        it("generateInterviewPrep succeeds when resumeText is exactly 50 characters", async () => {
            const exact50Chars = "12345678901234567890123456789012345678901234567890";
            expect(exact50Chars.length).toBe(50);

            mockChat.mockResolvedValueOnce({
                message: {
                    content: JSON.stringify({
                        questions: [
                            {
                                question: "How do you handle high concurrency?",
                                recruiterIntent: "Evaluates concurrency design.",
                                starModelAnswer: {
                                    situation: "10k RPS",
                                    task: "Scale workers",
                                    action: "Implemented worker pool",
                                    result: "Zero packet loss",
                                },
                            },
                        ],
                    }),
                },
            });

            const result = await generateInterviewPrep(mockChat, {
                resumeText: exact50Chars,
                jobTitle: "Staff Engineer",
            });

            expect(result).toBeDefined();
            expect(result.questions).toHaveLength(1);
        });

        it("generateInterviewPrep throws on truncated / unclosed JSON response from AI", async () => {
            // Cut off mid-stream
            mockChat.mockResolvedValueOnce({
                message: {
                    content: '{"questions": [{"question": "Why did you choose Go?", "recruiterIntent": "Tests language depth", "starModelAnswer": {"situa',
                },
            });

            await expect(
                generateInterviewPrep(mockChat, {
                    resumeText: "Senior Go Engineer with 7 years building distributed microservices and gRPC APIs.",
                    jobTitle: "Go Developer",
                })
            ).rejects.toThrow(/Failed to parse valid interview questions from AI response/i);
        });

        it("generateInterviewPrep throws when Puter AI returns null or missing message object", async () => {
            mockChat.mockResolvedValueOnce(null);

            await expect(
                generateInterviewPrep(mockChat, {
                    resumeText: "Senior Go Engineer with 7 years building distributed microservices and gRPC APIs.",
                    jobTitle: "Go Developer",
                })
            ).rejects.toThrow(/Puter AI returned an empty or invalid response/i);
        });

        it("generateInterviewPrep handles content block array responses (e.g., content: [{ text }])", async () => {
            mockChat.mockResolvedValueOnce({
                message: {
                    content: [
                        {
                            text: JSON.stringify({
                                questions: [
                                    {
                                        question: "Describe your deployment pipeline architecture.",
                                        recruiterIntent: "Assesses CI/CD rigor.",
                                        starModelAnswer: {
                                            situation: "Deploys took 45 minutes.",
                                            task: "Cut deploy time.",
                                            action: "Introduced ArgoCD.",
                                            result: "Deploys down to 4 minutes.",
                                        },
                                    },
                                ],
                            }),
                        },
                    ],
                },
            });

            const result = await generateInterviewPrep(mockChat, {
                resumeText: "DevOps Engineer with extensive Kubernetes and GitOps experience deploying microservices.",
                jobTitle: "DevOps Engineer",
            });

            expect(result.questions).toHaveLength(1);
            expect(result.questions[0].question).toContain("deployment pipeline architecture");
        });

        it("resiliently normalizes exotic, mixed-case, and unrecognized categories to standard types", async () => {
            mockChat.mockResolvedValueOnce({
                message: {
                    content: JSON.stringify({
                        questions: [
                            {
                                category: "TECHNICAL_DEEP_DIVE",
                                question: "Technical question?",
                                recruiterIntent: "Tests tech",
                                starModelAnswer: { situation: "s", task: "t", action: "a", result: "r" },
                            },
                            {
                                category: "High_Pressure_Situational",
                                question: "Situational question?",
                                recruiterIntent: "Tests situation",
                                starModelAnswer: { situation: "s", task: "t", action: "a", result: "r" },
                            },
                            {
                                category: "culture_and_values", // unknown, should map to behavioral
                                question: "Behavioral question?",
                                recruiterIntent: "Tests behavior",
                                starModelAnswer: { situation: "s", task: "t", action: "a", result: "r" },
                            },
                        ],
                    }),
                },
            });

            const result = await generateInterviewPrep(mockChat, {
                resumeText: "Full stack engineer with broad experience across modern frameworks and cloud systems.",
            });

            expect(result.questions[0].category).toBe("technical");
            expect(result.questions[1].category).toBe("situational");
            expect(result.questions[2].category).toBe("behavioral");
        });

        it("synthesizes fullAnswer if fullAnswer string is omitted by AI", async () => {
            mockChat.mockResolvedValueOnce({
                message: {
                    content: JSON.stringify({
                        questions: [
                            {
                                question: "How do you handle production incidents?",
                                recruiterIntent: "Assesses crisis triage.",
                                starModelAnswer: {
                                    situation: "Server outage.",
                                    task: "Restore service.",
                                    action: "Restarted pod.",
                                    result: "Service restored.",
                                    // fullAnswer omitted
                                },
                            },
                        ],
                    }),
                },
            });

            const result = await generateInterviewPrep(mockChat, {
                resumeText: "Site Reliability Engineer with experience managing multi-region Kubernetes clusters.",
            });

            expect(result.questions[0].starModelAnswer.fullAnswer).toBe(
                "Server outage. Restore service. Restarted pod. Service restored."
            );
        });

        it("sanitizes pitfallsToAvoid when AI provides non-array or messy items", async () => {
            mockChat.mockResolvedValueOnce({
                message: {
                    content: JSON.stringify({
                        questions: [
                            {
                                question: "Question with messy pitfalls?",
                                recruiterIntent: "Intent",
                                starModelAnswer: { situation: "s", task: "t", action: "a", result: "r" },
                                pitfallsToAvoid: "Not an array, just a single string",
                            },
                            {
                                question: "Question with mixed pitfalls array?",
                                recruiterIntent: "Intent",
                                starModelAnswer: { situation: "s", task: "t", action: "a", result: "r" },
                                pitfallsToAvoid: ["  Valid pitfall  ", "", null, 42],
                            },
                        ],
                    }),
                },
            });

            const result = await generateInterviewPrep(mockChat, {
                resumeText: "Software Engineer with background in automated testing and cloud deployments.",
            });

            // Non-array falls back to empty array
            expect(result.questions[0].pitfallsToAvoid).toEqual([]);
            // Mixed array: empty string filtered, numbers stringified ("42"), and String(null) captured as "null"
            expect(result.questions[1].pitfallsToAvoid).toEqual(["Valid pitfall", "null", "42"]);
        });
    });

    // =========================================================================
    // 2. Deterministic Offline Fallback Questions Verification
    // =========================================================================
    describe("2. Deterministic Offline Fallback Questions Verification", () => {
        it("getDefaultInterviewQuestions produces 3 questions conforming strictly to schema", () => {
            const fallbacks = getDefaultInterviewQuestions();
            expect(fallbacks).toHaveLength(3);

            // Validates against the strict validator
            expect(validateInterviewQuestions({ questions: fallbacks })).toBe(true);

            const categories = fallbacks.map((q) => q.category);
            expect(categories).toContain("behavioral");
            expect(categories).toContain("technical");
            expect(categories).toContain("situational");

            fallbacks.forEach((q) => {
                expect(q.id).toMatch(/^fallback-q\d+$/);
                expect(q.question.trim().length).toBeGreaterThan(10);
                expect(q.recruiterIntent.trim().length).toBeGreaterThan(10);
                expect(q.resumeAnchor.trim().length).toBeGreaterThan(10);
                expect(q.starModelAnswer.situation).toBeTruthy();
                expect(q.starModelAnswer.task).toBeTruthy();
                expect(q.starModelAnswer.action).toBeTruthy();
                expect(q.starModelAnswer.result).toBeTruthy();
                expect(q.starModelAnswer.fullAnswer).toBeTruthy();
                expect(Array.isArray(q.pitfallsToAvoid)).toBe(true);
                expect(q.pitfallsToAvoid.length).toBeGreaterThanOrEqual(2);
                expect(q.isBookmarked).toBe(false);
                expect(q.userPracticeResponse).toBe("");
            });
        });

        it("getDefaultInterviewQuestions properly anchors role and company parameters", () => {
            const role = "Principal Cryptographic Architect";
            const company = "Signal Foundation";
            const fallbacks = getDefaultInterviewQuestions(role, company);

            // Behavioral question anchor
            expect(fallbacks[0].resumeAnchor).toContain(role);
            expect(fallbacks[0].resumeAnchor).toContain(company);

            // Technical question anchor
            expect(fallbacks[1].resumeAnchor).toContain(role);

            // Situational question anchor
            expect(fallbacks[2].resumeAnchor).toContain(company);
        });

        it("getDefaultInterviewQuestions handles empty strings without crashing", () => {
            const fallbacks = getDefaultInterviewQuestions("", "");
            expect(fallbacks).toHaveLength(3);
            expect(fallbacks[0].resumeAnchor).toBeDefined();
        });

        it("InterviewPrepTab automatically switches to deterministic fallback questions when AI call rejects", async () => {
            const failingChat = vi.fn().mockRejectedValue(new Error("AI Gateway 503 Service Unavailable"));
            (usePuterStore as any).mockImplementation(() => ({
                ai: {
                    chat: failingChat,
                },
            }));

            const onSaveMock = vi.fn().mockResolvedValue(undefined);

            render(
                React.createElement(InterviewPrepTab, {
                    resumeId: "resume-stress-1",
                    jobTitle: "Lead Security Engineer",
                    companyName: "CrowdStrike",
                    parsedText: "Senior security engineer with 10 years experience in threat modeling and incident response.",
                    onSaveInterviewPrep: onSaveMock,
                })
            );

            // Click generate
            const generateBtn = screen.getByRole("button", { name: /Generate 6-8 Questions/i });
            fireEvent.click(generateBtn);

            // Verifies fallback questions appear and are saved to KV
            await waitFor(() => {
                expect(failingChat).toHaveBeenCalledOnce();
                expect(onSaveMock).toHaveBeenCalledOnce();
                expect(screen.getByText(/AI service note/i)).toBeInTheDocument();
                expect(screen.getByText(/AI Gateway 503 Service Unavailable/i)).toBeInTheDocument();
                // Check fallback question text
                expect(
                    screen.getByText(/Tell me about a time you led a technically challenging project under aggressive deadlines/i)
                ).toBeInTheDocument();
            });
        });
    });

    // =========================================================================
    // 3. Scratchpad Text Editing, Bookmark Toggling, & Category Filtering
    // =========================================================================
    describe("3. Scratchpad Text Editing, Bookmark Toggling, & Category Filtering", () => {
        const testSectionWithPartialData: InterviewPrepSection = {
            id: "prep-partial",
            targetRole: "Cloud Engineer",
            roleTitle: "Cloud Engineer",
            companyName: "AWS",
            generatedAt: new Date().toISOString(),
            questions: [
                {
                    id: "q-behav-1",
                    category: "behavioral",
                    question: "Behavioral question 1?",
                    recruiterIntent: "Intent B1",
                    resumeAnchor: "Anchor B1",
                    starModelAnswer: {
                        situation: "S1",
                        task: "T1",
                        action: "A1",
                        result: "R1",
                        fullAnswer: "Full Answer B1",
                    },
                    pitfallsToAvoid: ["Pitfall 1"],
                    isBookmarked: false,
                    userPracticeResponse: "",
                },
                {
                    id: "q-behav-2",
                    category: "behavioral",
                    question: "Behavioral question 2?",
                    recruiterIntent: "Intent B2",
                    resumeAnchor: "Anchor B2",
                    starModelAnswer: {
                        situation: "S2",
                        task: "T2",
                        action: "A2",
                        result: "R2",
                        fullAnswer: "Full Answer B2",
                    },
                    pitfallsToAvoid: ["Pitfall 2"],
                    isBookmarked: true,
                    userPracticeResponse: "Pre-existing drafted response.",
                },
                {
                    id: "q-tech-1",
                    category: "technical",
                    question: "Technical question 1?",
                    recruiterIntent: "Intent T1",
                    resumeAnchor: "Anchor T1",
                    starModelAnswer: {
                        situation: "S3",
                        task: "T3",
                        action: "A3",
                        result: "R3",
                        fullAnswer: "Full Answer T1",
                    },
                    pitfallsToAvoid: [],
                    isBookmarked: false,
                    userPracticeResponse: "",
                },
            ],
        };

        it("handles completely empty questions list gracefully", () => {
            render(
                React.createElement(InterviewPrepTab, {
                    resumeId: "resume-empty",
                    jobTitle: "Cloud Engineer",
                    companyName: "AWS",
                    initialInterviewPrep: {
                        id: "prep-empty",
                        targetRole: "Cloud Engineer",
                        generatedAt: new Date().toISOString(),
                        questions: [],
                    },
                })
            );

            // Filter pills should not be rendered when list is empty
            expect(screen.queryByRole("button", { name: /^All/i })).not.toBeInTheDocument();
            // Empty state hero should be rendered
            expect(screen.getByText(/Ready to Master Your Cloud Engineer Interview\?/i)).toBeInTheDocument();
        });

        it("filters questions correctly when list is partially populated (e.g. 0 situational questions)", () => {
            render(
                React.createElement(InterviewPrepTab, {
                    resumeId: "resume-partial",
                    jobTitle: "Cloud Engineer",
                    companyName: "AWS",
                    initialInterviewPrep: testSectionWithPartialData,
                })
            );

            // Filter button counts check
            expect(screen.getByRole("button", { name: "All (3)" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Behavioral (2)" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Technical (1)" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Situational (0)" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "★ Starred (1)" })).toBeInTheDocument();

            // Click Situational filter: 0 questions should be shown without crashing
            const situPill = screen.getByRole("button", { name: "Situational (0)" });
            fireEvent.click(situPill);

            expect(screen.queryByText(/Behavioral question 1\?/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Behavioral question 2\?/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Technical question 1\?/i)).not.toBeInTheDocument();

            // Click Starred filter: only 1 question should be shown
            const starredPill = screen.getByRole("button", { name: "★ Starred (1)" });
            fireEvent.click(starredPill);

            expect(screen.getByText(/Behavioral question 2\?/i)).toBeInTheDocument();
            expect(screen.queryByText(/Behavioral question 1\?/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Technical question 1\?/i)).not.toBeInTheDocument();
        });

        it("unbookmarking a question while inside Starred filter immediately removes it from view", async () => {
            const onSaveMock = vi.fn().mockResolvedValue(undefined);

            render(
                React.createElement(InterviewPrepTab, {
                    resumeId: "resume-partial",
                    jobTitle: "Cloud Engineer",
                    companyName: "AWS",
                    initialInterviewPrep: testSectionWithPartialData,
                    onSaveInterviewPrep: onSaveMock,
                })
            );

            // Switch to Starred filter
            fireEvent.click(screen.getByRole("button", { name: "★ Starred (1)" }));
            expect(screen.getByText(/Behavioral question 2\?/i)).toBeInTheDocument();

            // Click unbookmark on q-behav-2
            const unbookmarkBtn = screen.getByRole("button", { name: /Remove Bookmark/i });
            fireEvent.click(unbookmarkBtn);

            await waitFor(() => {
                expect(onSaveMock).toHaveBeenCalledOnce();
                const saved = onSaveMock.mock.calls[0][0];
                const q2 = saved.questions.find((q: any) => q.id === "q-behav-2");
                expect(q2.isBookmarked).toBe(false);

                // Question should disappear from Starred view
                expect(screen.queryByText(/Behavioral question 2\?/i)).not.toBeInTheDocument();
                // Starred pill count should now be 0
                expect(screen.getByRole("button", { name: "★ Starred (0)" })).toBeInTheDocument();
            });
        });

        it("scratchpad text editing updates live word count, persists via Save Draft, and handles clearing", async () => {
            const onSaveMock = vi.fn().mockResolvedValue(undefined);

            render(
                React.createElement(InterviewPrepTab, {
                    resumeId: "resume-partial",
                    jobTitle: "Cloud Engineer",
                    companyName: "AWS",
                    initialInterviewPrep: testSectionWithPartialData,
                    onSaveInterviewPrep: onSaveMock,
                })
            );

            // Expand all questions
            fireEvent.click(screen.getByRole("button", { name: /Expand All/i }));

            // Question 1 scratchpad starts with 0 words
            const scratchpads = screen.getAllByPlaceholderText(/Draft your own response here to rehearse/i);
            const q1Scratchpad = scratchpads[0];
            expect(q1Scratchpad).toHaveValue("");

            // Type 6 words into scratchpad
            fireEvent.change(q1Scratchpad, {
                target: { value: "One two three four five six." },
            });
            expect(q1Scratchpad).toHaveValue("One two three four five six.");
            expect(screen.getByText("6 words")).toBeInTheDocument();

            // Click Save Draft on question 1
            const saveDraftBtns = screen.getAllByRole("button", { name: /Save Draft/i });
            fireEvent.click(saveDraftBtns[0]);

            await waitFor(() => {
                expect(onSaveMock).toHaveBeenCalledOnce();
                const savedData = onSaveMock.mock.calls[0][0];
                const q1 = savedData.questions.find((q: any) => q.id === "q-behav-1");
                expect(q1.userPracticeResponse).toBe("One two three four five six.");
                expect(q1.userNotes).toBe("One two three four five six.");
                expect(q1.lastPracticedAt).toBeDefined();
                expect(screen.getByText(/✓ Practice draft saved to cloud/i)).toBeInTheDocument();
            });

            // Now test clearing the scratchpad
            onSaveMock.mockClear();
            fireEvent.change(q1Scratchpad, { target: { value: "   " } });
            fireEvent.click(saveDraftBtns[0]);

            await waitFor(() => {
                expect(onSaveMock).toHaveBeenCalledOnce();
                const savedData = onSaveMock.mock.calls[0][0];
                const q1 = savedData.questions.find((q: any) => q.id === "q-behav-1");
                expect(q1.userPracticeResponse).toBe("   ");
            });
        });

        it("preserves unsaved user in-progress scratchpad edits even when initialInterviewPrep prop changes", () => {
            const { rerender } = render(
                React.createElement(InterviewPrepTab, {
                    resumeId: "resume-partial",
                    jobTitle: "Cloud Engineer",
                    companyName: "AWS",
                    initialInterviewPrep: testSectionWithPartialData,
                })
            );

            // Expand all questions
            fireEvent.click(screen.getByRole("button", { name: /Expand All/i }));

            const scratchpads = screen.getAllByPlaceholderText(/Draft your own response here to rehearse/i);
            const q1Scratchpad = scratchpads[0];

            // User types unsaved edit
            fireEvent.change(q1Scratchpad, {
                target: { value: "Unsaved local candidate draft in progress..." },
            });
            expect(q1Scratchpad).toHaveValue("Unsaved local candidate draft in progress...");

            // Simulate parent component re-render with fresh initialInterviewPrep object reference
            rerender(
                React.createElement(InterviewPrepTab, {
                    resumeId: "resume-partial",
                    jobTitle: "Cloud Engineer",
                    companyName: "AWS",
                    initialInterviewPrep: {
                        ...testSectionWithPartialData,
                        generatedAt: new Date().toISOString(),
                    },
                })
            );

            // User's unsaved scratchpad edit MUST NOT be wiped out
            expect(q1Scratchpad).toHaveValue("Unsaved local candidate draft in progress...");
        });
    });

    // =========================================================================
    // 4. Copilot Rapid Submissions, Empty Inputs, & Whitespace Queries
    // =========================================================================
    describe("4. Copilot Rapid Submissions, Empty Inputs, & Whitespace Queries", () => {
        it("validateCopilotResponse verifies object structure and reply string", () => {
            expect(validateCopilotResponse(null)).toBe(false);
            expect(validateCopilotResponse(undefined)).toBe(false);
            expect(validateCopilotResponse("just string")).toBe(false);
            expect(validateCopilotResponse(123)).toBe(false);
            expect(validateCopilotResponse({})).toBe(false);
            expect(validateCopilotResponse({ response: "wrong key" })).toBe(false);
            expect(validateCopilotResponse({ reply: 1234 })).toBe(false);
            expect(validateCopilotResponse({ reply: "Valid reply" })).toBe(true);
            expect(validateCopilotResponse({ reply: "", actionSuggestions: [] })).toBe(true);
        });

        it("executeCopilotTurn rejects empty and whitespace-only user queries", async () => {
            await expect(
                executeCopilotTurn(mockChat, {
                    userMessage: "",
                    resumeContext: { targetRole: "Engineer" },
                })
            ).rejects.toThrow(/User message cannot be empty/i);

            await expect(
                executeCopilotTurn(mockChat, {
                    userMessage: "    \t\n   ",
                    resumeContext: { targetRole: "Engineer" },
                })
            ).rejects.toThrow(/User message cannot be empty/i);

            expect(mockChat).not.toHaveBeenCalled();
        });

        it("AICopilotTab disables Send button and suppresses submission when input is empty or whitespace-only", () => {
            const onSaveChat = vi.fn().mockResolvedValue(undefined);

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-copilot",
                    jobTitle: "Backend Architect",
                    companyName: "Stripe",
                    feedback: mockBaseFeedback,
                    keywordAnalysis: mockBaseKeywordAnalysis,
                    onSaveChat,
                })
            );

            const input = screen.getByPlaceholderText(/Ask Resumind Copilot about your resume/i);
            const sendBtn = screen.getByRole("button", { name: /^Send$/i });

            // Initially empty: disabled
            expect(sendBtn).toBeDisabled();

            // Type spaces only
            fireEvent.change(input, { target: { value: "     " } });
            expect(sendBtn).toBeDisabled();

            // Press enter or click
            fireEvent.submit(sendBtn.closest("form")!);
            expect(mockChat).not.toHaveBeenCalled();
            expect(onSaveChat).not.toHaveBeenCalled();
        });

        it("AICopilotTab locks against rapid concurrent submissions while a turn is in flight", async () => {
            let resolveChatPromise: any;
            const slowChat = vi.fn().mockImplementation(() => {
                return new Promise((resolve) => {
                    resolveChatPromise = resolve;
                });
            });

            (usePuterStore as any).mockImplementation(() => ({
                ai: {
                    chat: slowChat,
                },
            }));

            const onSaveChat = vi.fn().mockResolvedValue(undefined);

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-copilot",
                    jobTitle: "Backend Architect",
                    companyName: "Stripe",
                    feedback: mockBaseFeedback,
                    keywordAnalysis: mockBaseKeywordAnalysis,
                    onSaveChat,
                })
            );

            const input = screen.getByPlaceholderText(/Ask Resumind Copilot about your resume/i);
            const sendBtn = screen.getByRole("button", { name: /^Send$/i });

            fireEvent.change(input, { target: { value: "Tell me about my ATS score." } });
            fireEvent.click(sendBtn);

            // First call triggered
            expect(slowChat).toHaveBeenCalledOnce();
            expect(screen.getByText(/Resumind Copilot is thinking.../i)).toBeInTheDocument();

            // Attempt rapid duplicate clicks while sending
            fireEvent.click(sendBtn);
            fireEvent.click(sendBtn);
            // Attempt clicking quick prompt chip while sending
            const quickChip = screen.getByRole("button", { name: "Draft a 3-sentence executive summary" });
            fireEvent.click(quickChip);

            // slowChat should still have been called only once!
            expect(slowChat).toHaveBeenCalledOnce();

            // Resolve the in-flight AI call
            resolveChatPromise({
                message: {
                    content: JSON.stringify({
                        reply: "Your ATS score is 78. Add Kubernetes and Terraform to reach 90+.",
                    }),
                },
            });

            await waitFor(() => {
                expect(screen.getByText(/Your ATS score is 78/i)).toBeInTheDocument();
                expect(screen.queryByText(/Resumind Copilot is thinking.../i)).not.toBeInTheDocument();
            });
        });

        it("AICopilotTab clears conversation history when user confirms clear prompt", async () => {
            vi.spyOn(window, "confirm").mockReturnValue(true);
            const onSaveChat = vi.fn().mockResolvedValue(undefined);

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-copilot",
                    jobTitle: "Backend Architect",
                    companyName: "Stripe",
                    feedback: mockBaseFeedback,
                    keywordAnalysis: mockBaseKeywordAnalysis,
                    chatHistory: [
                        { id: "m1", role: "user", content: "Hi", timestamp: 100 },
                        { id: "m2", role: "assistant", content: "Hello", timestamp: 200 },
                    ],
                    onSaveChat,
                })
            );

            expect(screen.getByText("Hi")).toBeInTheDocument();

            const clearBtn = screen.getByRole("button", { name: /Clear chat history/i });
            fireEvent.click(clearBtn);

            await waitFor(() => {
                expect(window.confirm).toHaveBeenCalledOnce();
                expect(onSaveChat).toHaveBeenCalledWith([]);
                expect(screen.queryByText("Hi")).not.toBeInTheDocument();
            });
        });

        it("AICopilotTab preserves conversation history when user cancels clear prompt", async () => {
            vi.spyOn(window, "confirm").mockReturnValue(false);
            const onSaveChat = vi.fn().mockResolvedValue(undefined);

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-copilot",
                    jobTitle: "Backend Architect",
                    companyName: "Stripe",
                    feedback: mockBaseFeedback,
                    keywordAnalysis: mockBaseKeywordAnalysis,
                    chatHistory: [
                        { id: "m1", role: "user", content: "Keep this message", timestamp: 100 },
                    ],
                    onSaveChat,
                })
            );

            const clearBtn = screen.getByRole("button", { name: /Clear chat history/i });
            fireEvent.click(clearBtn);

            expect(window.confirm).toHaveBeenCalledOnce();
            expect(onSaveChat).not.toHaveBeenCalled();
            expect(screen.getByText("Keep this message")).toBeInTheDocument();
        });
    });

    // =========================================================================
    // 5. Action Engine Bridge Suggestions, Unrecognized Types, Missing Payloads
    // =========================================================================
    describe("5. Action Engine Bridge Suggestions & Edge Cases", () => {
        it("triggers onNavigateTab with target and payload on standard switch_tab action", () => {
            const onNavigateTab = vi.fn();

            const testMessages: CopilotMessage[] = [
                {
                    id: "msg-action-1",
                    role: "assistant",
                    content: "Let's optimize your bullets with STAR.",
                    timestamp: Date.now(),
                    actionSuggestions: [
                        {
                            id: "act-1",
                            label: "Optimize with STAR",
                            actionType: "switch_tab",
                            tabTarget: "star",
                            payload: "Draft bullet to rewrite",
                            icon: "✨",
                        },
                    ],
                },
            ];

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-bridge",
                    jobTitle: "Architect",
                    feedback: mockBaseFeedback,
                    chatHistory: testMessages,
                    onSaveChat: vi.fn().mockResolvedValue(undefined),
                    onNavigateTab,
                })
            );

            const actionBtn = screen.getByRole("button", { name: /Optimize with STAR/i });
            fireEvent.click(actionBtn);

            expect(onNavigateTab).toHaveBeenCalledWith("star", "Draft bullet to rewrite");
        });

        it("supports navigate_tab alias with targetTab parameter", () => {
            const onNavigateTab = vi.fn();

            const testMessages: CopilotMessage[] = [
                {
                    id: "msg-action-2",
                    role: "assistant",
                    content: "View missing keywords in the audit tab.",
                    timestamp: Date.now(),
                    actionSuggestions: [
                        {
                            id: "act-2",
                            label: "View Missing Keywords",
                            type: "navigate_tab",
                            targetTab: "keywords",
                            icon: "🎯",
                        },
                    ],
                },
            ];

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-bridge",
                    jobTitle: "Architect",
                    feedback: mockBaseFeedback,
                    chatHistory: testMessages,
                    onSaveChat: vi.fn().mockResolvedValue(undefined),
                    onNavigateTab,
                })
            );

            const actionBtn = screen.getByRole("button", { name: /View Missing Keywords/i });
            fireEvent.click(actionBtn);

            expect(onNavigateTab).toHaveBeenCalledWith("keywords", undefined);
        });

        it("gracefully ignores unrecognized action types without crashing or calling onNavigateTab", () => {
            const onNavigateTab = vi.fn();

            const testMessages: CopilotMessage[] = [
                {
                    id: "msg-action-unrec",
                    role: "assistant",
                    content: "Here is an unknown action:",
                    timestamp: Date.now(),
                    actionSuggestions: [
                        {
                            id: "act-unrec",
                            label: "Exotic Future Action",
                            actionType: "some_unrecognized_ai_action" as any,
                            tabTarget: "star",
                            payload: "something",
                        },
                    ],
                },
            ];

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-bridge",
                    jobTitle: "Architect",
                    feedback: mockBaseFeedback,
                    chatHistory: testMessages,
                    onSaveChat: vi.fn().mockResolvedValue(undefined),
                    onNavigateTab,
                })
            );

            const actionBtn = screen.getByRole("button", { name: /Exotic Future Action/i });
            // Clicking should not crash
            expect(() => fireEvent.click(actionBtn)).not.toThrow();
            // Should not have triggered navigation
            expect(onNavigateTab).not.toHaveBeenCalled();
        });

        it("gracefully handles switch_tab with missing or undefined tabTarget", () => {
            const onNavigateTab = vi.fn();

            const testMessages: CopilotMessage[] = [
                {
                    id: "msg-action-missing-target",
                    role: "assistant",
                    content: "Missing target action:",
                    timestamp: Date.now(),
                    actionSuggestions: [
                        {
                            id: "act-missing-target",
                            label: "Switch Nowhere",
                            actionType: "switch_tab",
                            // tabTarget and targetTab are missing
                        },
                    ],
                },
            ];

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-bridge",
                    jobTitle: "Architect",
                    feedback: mockBaseFeedback,
                    chatHistory: testMessages,
                    onSaveChat: vi.fn().mockResolvedValue(undefined),
                    onNavigateTab,
                })
            );

            const actionBtn = screen.getByRole("button", { name: /Switch Nowhere/i });
            fireEvent.click(actionBtn);

            expect(onNavigateTab).not.toHaveBeenCalled();
        });

        it("handles missing onNavigateTab prop gracefully without throwing", () => {
            const testMessages: CopilotMessage[] = [
                {
                    id: "msg-no-handler",
                    role: "assistant",
                    content: "Action with no parent handler provided:",
                    timestamp: Date.now(),
                    actionSuggestions: [
                        {
                            id: "act-no-handler",
                            label: "Click without Handler",
                            actionType: "switch_tab",
                            tabTarget: "star",
                        },
                    ],
                },
            ];

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-bridge",
                    jobTitle: "Architect",
                    feedback: mockBaseFeedback,
                    chatHistory: testMessages,
                    onSaveChat: vi.fn().mockResolvedValue(undefined),
                    // onNavigateTab is intentionally omitted
                })
            );

            const actionBtn = screen.getByRole("button", { name: /Click without Handler/i });
            expect(() => fireEvent.click(actionBtn)).not.toThrow();
        });

        it("copy_text action copies payload to clipboard and displays Copied state", async () => {
            const writeTextMock = vi.fn().mockResolvedValue(undefined);
            Object.assign(navigator, {
                clipboard: {
                    writeText: writeTextMock,
                },
            });

            const testMessages: CopilotMessage[] = [
                {
                    id: "msg-copy",
                    role: "assistant",
                    content: "Here is your suggested bullet:",
                    timestamp: Date.now(),
                    actionSuggestions: [
                        {
                            id: "act-copy-1",
                            label: "Copy Suggested Bullet",
                            actionType: "copy_text",
                            payload: "Architected microservices handling 20k RPS.",
                            icon: "📋",
                        },
                    ],
                },
            ];

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-bridge",
                    jobTitle: "Architect",
                    feedback: mockBaseFeedback,
                    chatHistory: testMessages,
                    onSaveChat: vi.fn().mockResolvedValue(undefined),
                })
            );

            const copyBtn = screen.getByRole("button", { name: /Copy Suggested Bullet/i });
            fireEvent.click(copyBtn);

            await waitFor(() => {
                expect(writeTextMock).toHaveBeenCalledWith("Architected microservices handling 20k RPS.");
                expect(screen.getByText(/✓ Copied/i)).toBeInTheDocument();
            });
        });

        it("copy_text action does nothing if payload is missing or empty", () => {
            const writeTextMock = vi.fn().mockResolvedValue(undefined);
            Object.assign(navigator, {
                clipboard: {
                    writeText: writeTextMock,
                },
            });

            const testMessages: CopilotMessage[] = [
                {
                    id: "msg-copy-empty",
                    role: "assistant",
                    content: "Empty payload copy:",
                    timestamp: Date.now(),
                    actionSuggestions: [
                        {
                            id: "act-copy-empty",
                            label: "Copy Empty",
                            actionType: "copy_text",
                            payload: undefined, // missing payload
                        },
                    ],
                },
            ];

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-bridge",
                    jobTitle: "Architect",
                    feedback: mockBaseFeedback,
                    chatHistory: testMessages,
                    onSaveChat: vi.fn().mockResolvedValue(undefined),
                })
            );

            const copyBtn = screen.getByRole("button", { name: /Copy Empty/i });
            fireEvent.click(copyBtn);

            expect(writeTextMock).not.toHaveBeenCalled();
            expect(screen.queryByText(/✓ Copied/i)).not.toBeInTheDocument();
        });

        it("quick_prompt action submits payload as next user turn", async () => {
            const onSaveChat = vi.fn().mockResolvedValue(undefined);

            const testMessages: CopilotMessage[] = [
                {
                    id: "msg-prompt-cta",
                    role: "assistant",
                    content: "Would you like to drill into missing keywords?",
                    timestamp: Date.now(),
                    actionSuggestions: [
                        {
                            id: "act-quick-1",
                            label: "Drill Missing Keywords",
                            actionType: "quick_prompt",
                            payload: "List practical ways to integrate Kafka and Kubernetes.",
                            icon: "💡",
                        },
                    ],
                },
            ];

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-bridge",
                    jobTitle: "Architect",
                    feedback: mockBaseFeedback,
                    chatHistory: testMessages,
                    onSaveChat,
                })
            );

            const promptBtn = screen.getByRole("button", { name: /Drill Missing Keywords/i });
            fireEvent.click(promptBtn);

            await waitFor(() => {
                expect(mockChat).toHaveBeenCalledOnce();
                expect(onSaveChat).toHaveBeenCalled();
                expect(screen.getByText("List practical ways to integrate Kafka and Kubernetes.")).toBeInTheDocument();
            });
        });

        it("resilient fallback synthesizes contextual actions from raw AI markdown", async () => {
            // When AI returns non-JSON text containing "cover letter" and "interview"
            mockChat.mockResolvedValueOnce({
                message: {
                    content: "I suggest you practice interview questions and prepare a targeted cover letter for this company.",
                },
            });

            const result = await executeCopilotTurn(mockChat, {
                userMessage: "What should I do next?",
                resumeContext: { targetRole: "Architect" },
            });

            expect(result.content).toContain("I suggest you practice interview questions");
            expect(result.actionSuggestions).toBeDefined();

            const actionTargets = result.actionSuggestions?.map((a) => a.tabTarget);
            expect(actionTargets).toContain("cover-letter");
            expect(actionTargets).toContain("interview-prep");
        });

        it("supports legacy single actionSuggestion object on assistant messages", () => {
            const onNavigateTab = vi.fn();

            const testMessages: CopilotMessage[] = [
                {
                    id: "msg-legacy-action",
                    role: "assistant",
                    content: "Legacy action suggestion format:",
                    timestamp: Date.now(),
                    actionSuggestion: {
                        id: "legacy-act",
                        label: "Legacy Action Button",
                        actionType: "switch_tab",
                        tabTarget: "cover-letter",
                        icon: "✉️",
                    },
                },
            ];

            render(
                React.createElement(AICopilotTab, {
                    resumeId: "resume-bridge",
                    jobTitle: "Architect",
                    feedback: mockBaseFeedback,
                    chatHistory: testMessages,
                    onSaveChat: vi.fn().mockResolvedValue(undefined),
                    onNavigateTab,
                })
            );

            const legacyBtn = screen.getByRole("button", { name: /Legacy Action Button/i });
            expect(legacyBtn).toBeInTheDocument();
            fireEvent.click(legacyBtn);

            expect(onNavigateTab).toHaveBeenCalledWith("cover-letter", undefined);
        });

        it("handles messages with missing or non-numeric timestamps without crashing", () => {
            const testMessages: CopilotMessage[] = [
                {
                    id: "msg-no-ts",
                    role: "assistant",
                    content: "Message with undefined timestamp",
                    timestamp: undefined as any,
                },
                {
                    id: "msg-string-ts",
                    role: "user",
                    content: "Message with string timestamp",
                    timestamp: "2026-11-08T12:00:00Z" as any,
                },
            ];

            expect(() => {
                render(
                    React.createElement(AICopilotTab, {
                        resumeId: "resume-bridge",
                        jobTitle: "Architect",
                        feedback: mockBaseFeedback,
                        chatHistory: testMessages,
                        onSaveChat: vi.fn().mockResolvedValue(undefined),
                    })
                );
            }).not.toThrow();

            expect(screen.getByText("Message with undefined timestamp")).toBeInTheDocument();
            expect(screen.getByText("Message with string timestamp")).toBeInTheDocument();
        });

        it("parses JSON response cleanly when wrapped in conversational introductory markdown and codeblocks", async () => {
            const messyMarkdownAiResponse = `
Here is my structured guidance for your resume:

\`\`\`json
{
  "reply": "Focus on quantifying your cloud architecture leadership.",
  "actionSuggestions": [
    {
      "id": "act-star-custom",
      "label": "Rewrite Bullets",
      "actionType": "switch_tab",
      "tabTarget": "star",
      "payload": "Lead architect on payments cloud"
    }
  ]
}
\`\`\`

Feel free to ask if you want further refinement!
`;

            mockChat.mockResolvedValueOnce({
                message: {
                    content: messyMarkdownAiResponse,
                },
            });

            const result = await executeCopilotTurn(mockChat, {
                userMessage: "How do I highlight my cloud leadership?",
                resumeContext: { targetRole: "Staff Cloud Architect" },
            });

            expect(result.content).toBe("Focus on quantifying your cloud architecture leadership.");
            expect(result.actionSuggestions).toHaveLength(1);
            expect(result.actionSuggestions?.[0].tabTarget).toBe("star");
            expect(result.actionSuggestions?.[0].payload).toBe("Lead architect on payments cloud");
        });
    });
});
