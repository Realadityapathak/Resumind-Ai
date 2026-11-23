import { describe, it, expect, vi } from "vitest";
import { prepareCopilotPrompt } from "~/features/copilot/prompt";
import { validateCopilotResponse, executeCopilotTurn } from "~/features/copilot/copilotEngine";

describe("AI Copilot Engine (app/lib/copilotEngine.ts)", () => {
    describe("prepareCopilotPrompt()", () => {
        it("injects resume context, ATS score, missing keywords, chat history, and user message", () => {
            const prompt = prepareCopilotPrompt({
                userMessage: "How can I improve my bullet points to better match this role?",
                conversationHistory: [
                    { id: "1", role: "user", content: "Hello", timestamp: 1000 },
                    { id: "2", role: "assistant", content: "Hi! How can I help?", timestamp: 2000 },
                ],
                resumeContext: {
                    targetRole: "Senior DevOps Engineer",
                    companyName: "Docker",
                    parsedText: "Maintained Kubernetes clusters and Docker containers for microservices.",
                    feedback: {
                        overallScore: 78,
                        ATS: { score: 80, tips: [] },
                        toneAndStyle: { score: 75, tips: [] },
                        content: { score: 70, tips: [] },
                        structure: { score: 85, tips: [] },
                        skills: { score: 72, tips: [] },
                    },
                    keywordAnalysis: {
                        missingKeywords: [
                            { keyword: "Terraform", category: "tools", frequencyInJob: 3, frequencyInResume: 0, importance: "critical" },
                            { keyword: "ArgoCD", category: "tools", frequencyInJob: 2, frequencyInResume: 0, importance: "critical" },
                        ],
                        missingCount: 2,
                        matchedKeywords: [],
                        matchedCount: 5,
                        matchRate: 71,
                        totalJobKeywords: 7,
                    },
                },
            });

            expect(prompt).toContain("Senior DevOps Engineer");
            expect(prompt).toContain("Docker");
            expect(prompt).toContain("Maintained Kubernetes clusters");
            expect(prompt).toContain("78/100");
            expect(prompt).toContain("Terraform");
            expect(prompt).toContain("How can I improve my bullet points");
            expect(prompt).toContain("Hi! How can I help?");
            expect(prompt).toContain("reply");
            expect(prompt).toContain("actionSuggestions");
        });
    });

    describe("validateCopilotResponse()", () => {
        it("returns true for objects containing a reply string", () => {
            expect(validateCopilotResponse({ reply: "Here is advice." })).toBe(true);
            expect(validateCopilotResponse({ reply: "With actions", actionSuggestions: [] })).toBe(true);
        });

        it("returns false for invalid structures", () => {
            expect(validateCopilotResponse(null)).toBe(false);
            expect(validateCopilotResponse(undefined)).toBe(false);
            expect(validateCopilotResponse("just string")).toBe(false);
            expect(validateCopilotResponse({})).toBe(false);
            expect(validateCopilotResponse({ notReply: "abc" })).toBe(false);
        });
    });

    describe("executeCopilotTurn() with Puter AI", () => {
        it("processes valid structured JSON AI response and parses action suggestions", async () => {
            const mockChat = vi.fn().mockResolvedValue({
                message: {
                    content: JSON.stringify({
                        reply: "I recommend rewriting your lead bullet point using the STAR method.",
                        actionSuggestions: [
                            {
                                id: "act-1",
                                label: "Rewrite Bullet with STAR",
                                actionType: "switch_tab",
                                tabTarget: "star",
                                icon: "✨",
                            },
                        ],
                    }),
                },
            });

            const result = await executeCopilotTurn(mockChat, {
                userMessage: "How do I fix my bullets?",
                resumeContext: {
                    targetRole: "DevOps Engineer",
                    companyName: "Docker",
                    parsedText: "Kubernetes and Docker experience.",
                },
            });

            expect(result).toBeDefined();
            expect(result.role).toBe("assistant");
            expect(result.content).toContain("I recommend rewriting your lead bullet");
            expect(result.actionSuggestions).toHaveLength(1);
            expect(result.actionSuggestions?.[0].tabTarget).toBe("star");
            expect(mockChat).toHaveBeenCalledOnce();
        });

        it("resiliently falls back to raw markdown and synthesizes action suggestions if AI returns plain text", async () => {
            const mockChat = vi.fn().mockResolvedValue({
                message: {
                    content: "To boost your score, consider adding missing keywords like Terraform and optimizing with STAR.",
                },
            });

            const result = await executeCopilotTurn(mockChat, {
                userMessage: "What should I do first?",
                resumeContext: {
                    targetRole: "DevOps Engineer",
                    companyName: "Docker",
                    parsedText: "Kubernetes and Docker experience.",
                },
            });

            expect(result).toBeDefined();
            expect(result.content).toContain("To boost your score, consider adding missing keywords");
            // Check synthesized actions based on keywords in response
            expect(result.actionSuggestions?.length).toBeGreaterThan(0);
            const targets = result.actionSuggestions?.map(a => a.tabTarget);
            expect(targets).toContain("star");
            expect(targets).toContain("keywords");
        });

        it("throws an error when user message is empty", async () => {
            const mockChat = vi.fn();
            await expect(
                executeCopilotTurn(mockChat, {
                    userMessage: "   ",
                    resumeContext: {
                        targetRole: "Role",
                        companyName: "Co",
                        parsedText: "Text",
                    },
                })
            ).rejects.toThrow(/User message cannot be empty/i);
            expect(mockChat).not.toHaveBeenCalled();
        });

        it("throws an error when AI returns an empty or rejected response", async () => {
            const mockChat = vi.fn().mockRejectedValue(new Error("AI connection timeout"));
            await expect(
                executeCopilotTurn(mockChat, {
                    userMessage: "Hello AI",
                    resumeContext: {
                        targetRole: "Role",
                        companyName: "Co",
                        parsedText: "Text",
                    },
                })
            ).rejects.toThrow("AI connection timeout");
        });
    });
});
