import { describe, it, expect, vi } from "vitest";
import { prepareKeywordGapPrompt } from "~/features/keyword-gap/prompt";
import {
    validateKeywordGapAnalysis,
    executeKeywordGapAnalysis,
} from "~/features/keyword-gap/keywordGapEngine";
import { tokenizeAndMatchKeywords } from "~/features/keyword-gap/keywordMatcher";

describe("ATS Keyword Gap Matrix Engine (app/lib/keywordGapEngine.ts & keywordMatcher.ts)", () => {
    describe("Prompt Construction", () => {
        it("embeds target role, job description, and resume text into prompt", () => {
            const prompt = prepareKeywordGapPrompt({
                resumeText: "Experienced in React, TypeScript, and Docker containerization.",
                jobTitle: "Staff Software Engineer",
                jobDescription: "Must have deep expertise in React, TypeScript, Kubernetes, and GraphQL.",
            });

            expect(prompt).toContain("Staff Software Engineer");
            expect(prompt).toContain("React, TypeScript, Kubernetes, and GraphQL.");
            expect(prompt).toContain("Experienced in React, TypeScript, and Docker containerization.");
            expect(prompt).toContain("Extract 15-25 of the most critical hard skills");
            expect(prompt).toContain("matchedKeywords");
            expect(prompt).toContain("missingKeywords");
            expect(prompt).toContain("matchRate");
        });
    });

    describe("validateKeywordGapAnalysis()", () => {
        it("validates correct keyword analysis object structure", () => {
            const valid = {
                matchRate: 80,
                totalJobKeywords: 5,
                matchedCount: 4,
                missingCount: 1,
                matchedKeywords: [{ keyword: "React", category: "technical", frequencyInJob: 3, frequencyInResume: 2, importance: "critical" }],
                missingKeywords: [{ keyword: "AWS", category: "tools", frequencyInJob: 2, frequencyInResume: 0, importance: "recommended" }],
            };
            expect(validateKeywordGapAnalysis(valid)).toBe(true);
        });

        it("rejects non-object or missing arrays", () => {
            expect(validateKeywordGapAnalysis(null)).toBe(false);
            expect(validateKeywordGapAnalysis({ matchRate: 50 })).toBe(false);
            expect(validateKeywordGapAnalysis({ matchedKeywords: [] })).toBe(false);
        });
    });

    describe("executeKeywordGapAnalysis()", () => {
        it("rejects job description shorter than 20 characters", async () => {
            const mockAi = vi.fn();
            await expect(
                executeKeywordGapAnalysis(mockAi, {
                    resumeText: "Resume text...",
                    jobDescription: "Short JD",
                })
            ).rejects.toThrow("at least 20 characters");
        });

        it("calls AI and calculates accurate matchRate and keyword metrics", async () => {
            const mockAiResponse = {
                message: {
                    content: JSON.stringify({
                        matchRate: 67,
                        totalJobKeywords: 3,
                        matchedKeywords: [
                            { keyword: "React", category: "technical", frequencyInJob: 4, frequencyInResume: 3, importance: "critical", contextOrSuggestion: "Found in experience" },
                            { keyword: "TypeScript", category: "technical", frequencyInJob: 3, frequencyInResume: 2, importance: "critical", contextOrSuggestion: "Found in skills" },
                        ],
                        missingKeywords: [
                            { keyword: "Terraform", category: "tools", frequencyInJob: 2, frequencyInResume: 0, importance: "recommended", contextOrSuggestion: "Add to DevOps projects" },
                        ],
                        topRecommendations: ["Add Terraform to your cloud projects."],
                    }),
                },
            };

            const mockAi = vi.fn().mockResolvedValue(mockAiResponse);

            const result = await executeKeywordGapAnalysis(mockAi, {
                resumeText: "Senior Frontend Engineer with React and TypeScript.",
                jobTitle: "Lead Frontend Engineer",
                jobDescription: "Requires React, TypeScript, and Terraform cloud automation.",
            });

            expect(mockAi).toHaveBeenCalled();
            expect(result.matchedCount).toBe(2);
            expect(result.missingCount).toBe(1);
            expect(result.matchRate).toBe(67);
            expect(result.matchedKeywords[0].keyword).toBe("React");
            expect(result.missingKeywords[0].keyword).toBe("Terraform");
            expect(result.topRecommendations).toContain("Add Terraform to your cloud projects.");
        });
    });

    describe("Deterministic Client-Side Fallback (tokenizeAndMatchKeywords)", () => {
        it("returns empty result safely when job description is empty", () => {
            const result = tokenizeAndMatchKeywords("Some resume text", "");
            expect(result.matchRate).toBe(0);
            expect(result.totalJobKeywords).toBe(0);
            expect(result.matchedKeywords).toEqual([]);
        });

        it("correctly identifies matched vs missing keywords and computes match percentage", () => {
            const resumeText = "Experienced in React, TypeScript, Node.js, and PostgreSQL database performance tuning.";
            const jobDescription = "Seeking an engineer with React, TypeScript, Kubernetes, and Docker experience. Kubernetes is critical.";

            const result = tokenizeAndMatchKeywords(resumeText, jobDescription);

            expect(result.totalJobKeywords).toBeGreaterThan(0);
            const matchedNames = result.matchedKeywords.map((k) => k.keyword.toLowerCase());
            const missingNames = result.missingKeywords.map((k) => k.keyword.toLowerCase());

            expect(matchedNames).toContain("react");
            expect(matchedNames).toContain("typescript");
            expect(missingNames).toContain("kubernetes");
            expect(result.matchRate).toBeGreaterThan(0);
            expect(result.matchRate).toBeLessThanOrEqual(100);
        });
    });
});
