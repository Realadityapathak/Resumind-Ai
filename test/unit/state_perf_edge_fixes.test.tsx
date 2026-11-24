import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { usePuterStore } from "~/services/puter/store";
import PdfPreviewer from "~/features/resume-workspace/PdfPreviewer";
import OverviewTab from "~/features/resume-workspace/OverviewTab";
import DetailsTab from "~/features/resume-workspace/DetailsTab";
import { AICopilotTab } from "~/features/copilot/AICopilotTab";

describe("State, Performance, Edge Cases & Error Handling Hardening Verification", () => {
    describe("1. Puter Store Stale getUser Closure Fix", () => {
        it("auth.getUser() dynamically returns null rather than a stale user after setError occurs", async () => {
            const store = usePuterStore.getState();

            // Simulate authenticated user
            const mockUser: PuterUser = {
                uuid: "user-123",
                username: "alex",
            };

            // Manually set authenticated state
            usePuterStore.setState({
                authStatus: "authenticated",
                auth: {
                    ...store.auth,
                    user: mockUser,
                    isAuthenticated: true,
                    authStatus: "authenticated",
                },
            });

            expect(usePuterStore.getState().auth.getUser()).toEqual(mockUser);

            // Now trigger an error (e.g. Puter SDK failure)
            window.puter = undefined as any;
            await usePuterStore.getState().fs.read("/invalid/path");

            // Verify error was set and getUser returns null (NOT the stale mockUser)
            const updated = usePuterStore.getState();
            expect(updated.authStatus).toBe("unauthenticated");
            expect(updated.auth.user).toBeNull();
            expect(updated.auth.getUser()).toBeNull();
        });
    });

    describe("2. PdfPreviewer Boundary & Defensive Checks", () => {
        it("handles null parsedText without throwing TypeError", () => {
            expect(() => {
                render(
                    <PdfPreviewer
                        parsedText={null as any}
                        pageCount={1}
                    />
                );
            }).not.toThrow();

            // Switch to plaintext view
            const plaintextBtn = screen.getByRole("button", { name: /Plaintext/i });
            fireEvent.click(plaintextBtn);

            expect(screen.getByText(/0 words/i)).toBeInTheDocument();
            expect(screen.getByText(/0 characters/i)).toBeInTheDocument();
        });
    });

    describe("3. OverviewTab Corrupted Tips Edge Case", () => {
        it("renders without throwing when feedback tips contain null or malformed elements", () => {
            const corruptedFeedback: Feedback = {
                overallScore: 75,
                ATS: {
                    score: 75,
                    tips: [
                        null as any,
                        { type: "improve", tip: "Improve missing keyword Docker" },
                        undefined as any,
                    ],
                },
                toneAndStyle: { score: 80, tips: [null as any] },
                content: { score: 70, tips: [null as any] },
                structure: { score: 75, tips: [null as any] },
                skills: { score: 80, tips: [null as any] },
            };

            expect(() => {
                render(
                    <OverviewTab
                        feedback={corruptedFeedback}
                        onNavigateTab={vi.fn()}
                    />
                );
            }).not.toThrow();

            expect(screen.getByText(/Improve missing keyword Docker/i)).toBeInTheDocument();
        });
    });

    describe("4. DetailsTab Corrupted Tips Edge Case", () => {
        it("renders without throwing when category tips contain null items", () => {
            const corruptedFeedback: Feedback = {
                overallScore: 65,
                ATS: { score: 65, tips: [] },
                toneAndStyle: {
                    score: 70,
                    tips: [
                        null as any,
                        { type: "good", tip: "Strong action verbs" },
                        { type: "improve", tip: "Avoid passive voice", explanation: "Passive voice weakens impact." },
                    ],
                },
                content: { score: 60, tips: [null as any] },
                structure: { score: 65, tips: [null as any] },
                skills: { score: 70, tips: [null as any] },
            };

            expect(() => {
                render(<DetailsTab feedback={corruptedFeedback} />);
            }).not.toThrow();

            expect(screen.getByText("Strong action verbs")).toBeInTheDocument();
            expect(screen.getByText("Avoid passive voice")).toBeInTheDocument();
        });
    });

    describe("5. AICopilotTab Message History Synchronization", () => {
        it("preserves candidate message when AI responds immediately (no stale closure drop)", async () => {
            const mockChat = vi.fn().mockImplementation(async () => ({
                message: {
                    content: JSON.stringify({
                        reply: "Here is guidance on your question.",
                        actionSuggestions: [],
                    }),
                },
            }));

            usePuterStore.setState({
                ai: {
                    ...usePuterStore.getState().ai,
                    chat: mockChat,
                },
            });

            const onSaveChat = vi.fn().mockResolvedValue(undefined);

            render(
                <AICopilotTab
                    resumeId="res-abc"
                    feedback={{ overallScore: 80 } as any}
                    onSaveChat={onSaveChat}
                />
            );

            const input = screen.getByPlaceholderText(/Ask Resumind Copilot/i);
            fireEvent.change(input, { target: { value: "Immediate synchronous question" } });
            fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

            await waitFor(() => {
                expect(screen.getByText("Immediate synchronous question")).toBeInTheDocument();
                expect(screen.getByText("Here is guidance on your question.")).toBeInTheDocument();
            });

            // onSaveChat should be called with BOTH the user message and assistant reply
            expect(onSaveChat).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ content: "Immediate synchronous question", role: "user" }),
                    expect.objectContaining({ content: "Here is guidance on your question.", role: "assistant" }),
                ])
            );
        });
    });
});
