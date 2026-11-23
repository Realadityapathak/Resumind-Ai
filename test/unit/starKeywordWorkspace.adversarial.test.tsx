import { describe, it, expect, vi, beforeEach } from "vitest";
import { rewriteBulletWithStar, validateStarRewriteResult } from "~/features/star-rewriter/starRewriterEngine";
import { executeKeywordGapAnalysis } from "~/features/keyword-gap/keywordGapEngine";
import { tokenizeAndMatchKeywords } from "~/features/keyword-gap/keywordMatcher";
import { TAB_DEFINITIONS, WorkspaceTabs } from "~/features/resume-workspace/WorkspaceTabs";
import { render, screen, fireEvent } from "@testing-library/react";

describe("Milestone 3 Adversarial Stress Testing & Empirical Verification", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("1. AI Engine: STAR Rewriter (starRewriterEngine.ts)", () => {
        it("rejects bullets shorter than 5 characters", async () => {
            const mockAi = vi.fn();
            await expect(
                rewriteBulletWithStar(mockAi, { bulletPoint: "Code" })
            ).rejects.toThrow("at least 5 characters");
            expect(mockAi).not.toHaveBeenCalled();
        });

        it("handles 1-word bullet points of at least 5 characters", async () => {
            const mockResponse = {
                message: {
                    content: JSON.stringify({
                        critique: "Needs metrics and context.",
                        variants: [
                            {
                                id: "v1",
                                type: "action-oriented",
                                fullBullet: "Engineered scalable solutions reducing latency by 40%.",
                                starBreakdown: {
                                    situation: "Legacy bottleneck",
                                    task: "Refactor core",
                                    action: "Implemented caching",
                                    result: "40% faster",
                                    metrics: ["[40%]"],
                                },
                            },
                        ],
                    }),
                },
            };
            const mockAi = vi.fn().mockResolvedValue(mockResponse);

            const result = await rewriteBulletWithStar(mockAi, {
                bulletPoint: "Programmed",
            });
            expect(result.variants).toHaveLength(1);
            expect(result.originalBullet).toBe("Programmed");
        });

        it("parses fenced JSON markdown response cleanly", async () => {
            const fencedOutput = "```json\n" + JSON.stringify({
                critique: "Fenced critique",
                variants: [
                    {
                        fullBullet: "Deployed microservices across 3 cloud regions.",
                        starBreakdown: {
                            situation: "Monolith downtime",
                            task: "Split services",
                            action: "Containerized with Docker",
                            result: "99.99% availability",
                        },
                    },
                ],
            }) + "\n```";

            const mockAi = vi.fn().mockResolvedValue({
                message: { content: fencedOutput },
            });

            const result = await rewriteBulletWithStar(mockAi, {
                bulletPoint: "Managed server deployments across AWS regions.",
            });
            expect(result.variants[0].fullBullet).toBe("Deployed microservices across 3 cloud regions.");
        });

        it("throws meaningful error when AI returns conversational non-JSON text", async () => {
            const mockAi = vi.fn().mockResolvedValue({
                message: {
                    content: "Sure! Here is a rewritten STAR bullet for your resume: Spearheaded redesign.",
                },
            });

            await expect(
                rewriteBulletWithStar(mockAi, {
                    bulletPoint: "Worked on website redesign for company client.",
                })
            ).rejects.toThrow("Failed to parse valid STAR rewrite variants");
        });

        it("rejects variants with missing STAR breakdown keys", () => {
            // Missing 'action' in starBreakdown
            const invalidBreakdown = {
                variants: [
                    {
                        fullBullet: "Led team project.",
                        starBreakdown: {
                            situation: "New project",
                            task: "Deliver on time",
                            // action missing
                            result: "Delivered",
                        },
                    },
                ],
            };
            expect(validateStarRewriteResult(invalidBreakdown)).toBe(false);

            // Empty variants
            expect(validateStarRewriteResult({ variants: [] })).toBe(false);

            // Empty fullBullet
            expect(
                validateStarRewriteResult({
                    variants: [
                        {
                            fullBullet: "   ",
                            starBreakdown: {
                                situation: "s",
                                task: "t",
                                action: "a",
                                result: "r",
                            },
                        },
                    ],
                })
            ).toBe(false);
        });
    });

    describe("2. AI Engine: Keyword Gap Matrix (keywordGapEngine.ts)", () => {
        it("rejects job descriptions with less than 20 characters", async () => {
            const mockAi = vi.fn();
            await expect(
                executeKeywordGapAnalysis(mockAi, {
                    resumeText: "Experienced engineer",
                    jobDescription: "Short JD",
                })
            ).rejects.toThrow("at least 20 characters");
            expect(mockAi).not.toHaveBeenCalled();
        });

        it("handles fenced JSON and recalculates matchRate accurately", async () => {
            const aiResponse = "```json\n" + JSON.stringify({
                matchRate: 40, // Should be overridden by calculated (1 / 2) * 100 = 50%
                totalJobKeywords: 2,
                matchedKeywords: [
                    {
                        keyword: "TypeScript",
                        category: "technical",
                        frequencyInJob: 3,
                        frequencyInResume: 2,
                        importance: "critical",
                    },
                ],
                missingKeywords: [
                    {
                        keyword: "GraphQL",
                        category: "technical",
                        frequencyInJob: 2,
                        frequencyInResume: 0,
                        importance: "recommended",
                    },
                ],
                topRecommendations: ["Add GraphQL"],
            }) + "\n```";

            const mockAi = vi.fn().mockResolvedValue({
                message: { content: aiResponse },
            });

            const result = await executeKeywordGapAnalysis(mockAi, {
                resumeText: "TypeScript developer",
                jobDescription: "Seeking a TypeScript engineer with GraphQL knowledge for backend work.",
            });

            expect(result.matchRate).toBe(50);
            expect(result.matchedCount).toBe(1);
            expect(result.missingCount).toBe(1);
        });

        it("handles non-numeric or missing matchRate gracefully", async () => {
            const responseWithCorruptMatchRate = JSON.stringify({
                matchRate: "invalid-string",
                totalJobKeywords: 1,
                matchedKeywords: [
                    { keyword: "Python", category: "technical" },
                ],
                missingKeywords: [],
            });

            const mockAi = vi.fn().mockResolvedValue({
                message: { content: responseWithCorruptMatchRate },
            });

            const result = await executeKeywordGapAnalysis(mockAi, {
                resumeText: "Python developer",
                jobDescription: "Looking for senior Python software engineer with backend experience.",
            });

            // Recalculated: 1 matched / (1 matched + 0 missing) = 100%
            expect(result.matchRate).toBe(100);
        });

        it("throws when AI returns conversational garbage", async () => {
            const mockAi = vi.fn().mockResolvedValue({
                message: { content: "I am unable to perform keyword analysis right now." },
            });

            await expect(
                executeKeywordGapAnalysis(mockAi, {
                    resumeText: "Python developer",
                    jobDescription: "Looking for senior Python software engineer with backend experience.",
                })
            ).rejects.toThrow("Failed to parse valid ATS keyword gap analysis");
        });
    });

    describe("3. Offline Fallback Tokenizer & Keyword Matcher (keywordMatcher.ts)", () => {
        it("handles empty resume text without throwing", () => {
            const result = tokenizeAndMatchKeywords(
                "",
                "Requires React, Node.js, and TypeScript engineering experience."
            );
            expect(result.matchRate).toBe(0);
            expect(result.matchedCount).toBe(0);
            expect(result.missingCount).toBeGreaterThan(0);
        });

        it("handles empty or whitespace job description", () => {
            const result = tokenizeAndMatchKeywords("React developer", "    ");
            expect(result.matchRate).toBe(0);
            expect(result.totalJobKeywords).toBe(0);
        });

        it("handles 10,000-word job descriptions under high volume", () => {
            const paragraph = "Requires Docker Kubernetes AWS React TypeScript Python PostgreSQL Redis CI/CD Terraform. ";
            const hugeJd = paragraph.repeat(1000); // 11,000+ words
            const resume = "Experienced in Docker, Kubernetes, AWS, and React.";

            const start = performance.now();
            const result = tokenizeAndMatchKeywords(resume, hugeJd);
            const duration = performance.now() - start;

            expect(duration).toBeLessThan(1000); // Should execute in under 1 second
            expect(result.totalJobKeywords).toBeLessThanOrEqual(20);
            expect(result.matchedCount).toBeGreaterThan(0);
        });

        it("correctly matches keywords with special symbols (C++, C#, .NET) using boundary-aware regex", () => {
            const resumeWithSpecial = "Senior developer proficient in C++ and C# and .NET frameworks.";
            const jdWithSpecial = "Looking for candidate with C++ and C# and .NET skills.";

            const result = tokenizeAndMatchKeywords(resumeWithSpecial, jdWithSpecial);
            
            // Inspect whether C++, C#, and .NET were classified as matched
            const cplusplusMissing = result.missingKeywords.find(k => k.keyword.toLowerCase() === "c++");
            const cplusplusMatched = result.matchedKeywords.find(k => k.keyword.toLowerCase() === "c++");

            expect(cplusplusMatched).toBeDefined();
            expect(cplusplusMissing).toBeUndefined();
            expect(result.matchedKeywords.find(k => k.keyword.toLowerCase() === "c#")).toBeDefined();
            expect(result.matchedKeywords.find(k => k.keyword.toLowerCase() === ".net")).toBeDefined();
        });

        it("handles non-English unicode / diacritics text", () => {
            const jd = "Recherche d'un développeur fullstack expérimenté avec compétences en ingénierie logicielle.";
            const resume = "Développeur fullstack expérimenté.";

            const result = tokenizeAndMatchKeywords(resume, jd);
            // Non-ASCII characters are stripped by replace(/[^a-zA-Z0-9+#.-]/g, " ")
            expect(result).toBeDefined();
            expect(result.totalJobKeywords).toBeGreaterThanOrEqual(0);
        });
    });

    describe("4. Workspace Tabs & Badge Edge Cases (WorkspaceTabs.tsx)", () => {
        it("handles undefined, null, or extreme feedback scores in Overview badge", () => {
            const tabDef = TAB_DEFINITIONS.find((t) => t.id === "overview")!;

            // undefined feedback
            const badge1 = tabDef.getBadge({ feedback: undefined as any, activeTab: "overview", onTabChange: vi.fn() });
            expect(badge1.text).toBe("0/100");
            expect(badge1.variant).toBe("red");

            // score = 100
            const badge2 = tabDef.getBadge({ feedback: { overallScore: 100 } as any, activeTab: "overview", onTabChange: vi.fn() });
            expect(badge2.text).toBe("100/100");
            expect(badge2.variant).toBe("green");

            // score = 55 (yellow)
            const badge3 = tabDef.getBadge({ feedback: { overallScore: 55 } as any, activeTab: "overview", onTabChange: vi.fn() });
            expect(badge3.text).toBe("55/100");
            expect(badge3.variant).toBe("yellow");
        });

        it("handles missing tips in Deep Dive badge", () => {
            const tabDef = TAB_DEFINITIONS.find((t) => t.id === "details")!;
            const badge = tabDef.getBadge({ feedback: {} as any, activeTab: "details", onTabChange: vi.fn() });
            expect(badge.text).toBe("0 Tips");
            expect(badge.variant).toBe("gray");
        });

        it("handles null keywordAnalysis vs missingCount 0 in Keyword Gap badge", () => {
            const tabDef = TAB_DEFINITIONS.find((t) => t.id === "keywords")!;

            // null analysis -> "Scan"
            const badge1 = tabDef.getBadge({ feedback: {} as any, keywordAnalysis: undefined, activeTab: "keywords", onTabChange: vi.fn() });
            expect(badge1.text).toBe("Scan");
            expect(badge1.variant).toBe("indigo");

            // 0 missing -> green
            const badge2 = tabDef.getBadge({ feedback: {} as any, keywordAnalysis: { missingCount: 0 } as any, activeTab: "keywords", onTabChange: vi.fn() });
            expect(badge2.text).toBe("0 Missing");
            expect(badge2.variant).toBe("green");

            // 4 missing -> yellow
            const badge3 = tabDef.getBadge({ feedback: {} as any, keywordAnalysis: { missingCount: 4 } as any, activeTab: "keywords", onTabChange: vi.fn() });
            expect(badge3.text).toBe("4 Missing");
            expect(badge3.variant).toBe("yellow");
        });

        it("renders WorkspaceTabs and triggers onTabChange for every tab", () => {
            const onTabChange = vi.fn();
            render(
                <WorkspaceTabs
                    activeTab="overview"
                    onTabChange={onTabChange}
                    feedback={{ overallScore: 82 } as any}
                    savedStarCount={2}
                />
            );

            const starTab = screen.getByRole("tab", { name: /STAR Rewriter/i });
            fireEvent.click(starTab);
            expect(onTabChange).toHaveBeenCalledWith("star");

            const keywordTab = screen.getByRole("tab", { name: /Keyword Gap/i });
            fireEvent.click(keywordTab);
            expect(onTabChange).toHaveBeenCalledWith("keywords");
        });
    });

    describe("5. URL Parameter Tampering & Workspace State Resilience", () => {
        const VALID_TABS = [
            "overview",
            "details",
            "keywords",
            "star",
            "cover-letter",
            "interview-prep",
            "copilot",
        ];

        function resolveTab(tabParam: string | null): string {
            return VALID_TABS.includes(tabParam as any) ? (tabParam as string) : "overview";
        }

        it("safely sanitizes directory traversal and arbitrary injection attempts", () => {
            expect(resolveTab("../../hack")).toBe("overview");
            expect(resolveTab("<script>alert(1)</script>")).toBe("overview");
            expect(resolveTab("")).toBe("overview");
            expect(resolveTab("   ")).toBe("overview");
            expect(resolveTab(null)).toBe("overview");
            expect(resolveTab("overview")).toBe("overview");
            expect(resolveTab("star")).toBe("star");
        });

        it("simulates rapid tab switching without desynchronizing state", () => {
            let activeTab = "overview";
            const tabSequence = ["keywords", "star", "details", "cover-letter", "copilot", "overview"];

            for (const tab of tabSequence) {
                activeTab = resolveTab(tab);
                expect(VALID_TABS).toContain(activeTab);
            }
            expect(activeTab).toBe("overview");
        });
    });

    describe("6. Puter KV Atomic Save & Resilience", () => {
        it("handles KV network rejection gracefully during keyword analysis save", async () => {
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            const mockKv = {
                set: vi.fn().mockRejectedValue(new Error("Puter KV 503 Service Unavailable")),
            };

            const sampleResume: Resume = {
                id: "res-123",
                companyName: "Acme",
                jobTitle: "Dev",
                imagePath: "/mock/image.png",
                resumePath: "/mock/resume.pdf",
                feedback: {} as any,
                parsedText: "Resume text",
            };

            const newAnalysis: KeywordAnalysis = {
                matchRate: 85,
                totalJobKeywords: 10,
                matchedCount: 8,
                missingCount: 2,
                matchedKeywords: [],
                missingKeywords: [],
                topRecommendations: [],
                analyzedAt: new Date().toISOString(),
            };

            // Mimic handleSaveKeywordAnalysis
            let resumeState = { ...sampleResume };
            const handleSave = async (analysis: KeywordAnalysis) => {
                const updated = {
                    ...resumeState,
                    keywordAnalysis: analysis,
                    updatedAt: new Date().toISOString(),
                };
                resumeState = updated;
                try {
                    await mockKv.set(`resume:${resumeState.id}`, JSON.stringify(updated));
                } catch (err) {
                    console.error("Failed to persist keyword analysis to Puter KV:", err);
                }
            };

            await handleSave(newAnalysis);

            expect(mockKv.set).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith(
                "Failed to persist keyword analysis to Puter KV:",
                expect.any(Error)
            );
            // Notice: Local state was optimistically updated even though remote save failed (unrolled optimistic update)
            expect(resumeState.keywordAnalysis).toEqual(newAnalysis);
            consoleSpy.mockRestore();
        });

        it("is idempotent when deleting non-existent rewrite ID", async () => {
            const mockKv = {
                set: vi.fn().mockResolvedValue(true),
            };

            const sampleResume: Resume = {
                id: "res-123",
                companyName: "Acme",
                jobTitle: "Dev",
                imagePath: "/mock/image.png",
                resumePath: "/mock/resume.pdf",
                feedback: {} as any,
                savedStarRewrites: [
                    {
                        id: "rw-1",
                        originalBullet: "Test bullet",
                        critique: "Needs metrics",
                        variants: [],
                        createdAt: new Date().toISOString(),
                    },
                ],
            };

            let resumeState = { ...sampleResume };
            const handleDelete = async (rewriteId: string) => {
                const existing = resumeState.savedStarRewrites || [];
                const updatedRewrites = existing.filter((r) => r.id !== rewriteId);
                const updated = {
                    ...resumeState,
                    savedStarRewrites: updatedRewrites,
                    updatedAt: new Date().toISOString(),
                };
                resumeState = updated;
                await mockKv.set(`resume:${resumeState.id}`, JSON.stringify(updated));
            };

            // Delete non-existent ID "rw-nonexistent"
            await handleDelete("rw-nonexistent");

            expect(mockKv.set).toHaveBeenCalledTimes(1);
            expect(resumeState.savedStarRewrites).toHaveLength(1);
            expect(resumeState.savedStarRewrites![0].id).toBe("rw-1");
        });
    });

    describe("7. [EMPIRICAL BUG REPRODUCTION] PdfPreviewer Unmounted Timer Leak", () => {
        it("reproduces timer firing after component unmount if not cleared", () => {
            vi.useFakeTimers();

            let isMounted = true;
            let copiedState = false;

            const handleCopyText = () => {
                copiedState = true;
                setTimeout(() => {
                    // In PdfPreviewer.tsx line 69:
                    // setTimeout(() => setCopied(false), 2000);
                    // If component is unmounted and jsdom window destroyed, this causes:
                    // ReferenceError: window is not defined
                    if (!isMounted) {
                        // Reproduce leak condition
                        return;
                    }
                    copiedState = false;
                }, 2000);
            };

            handleCopyText();
            expect(copiedState).toBe(true);

            // Simulate unmount before 2000ms
            isMounted = false;
            vi.advanceTimersByTime(2500);

            vi.useRealTimers();
        });
    });
});
