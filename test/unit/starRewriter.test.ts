import { describe, it, expect, vi } from "vitest";
import { prepareStarRewriterPrompt, getStarToneGuideline } from "~/features/star-rewriter/prompt";
import {
    validateStarRewriteResult,
    rewriteBulletWithStar,
} from "~/features/star-rewriter/starRewriterEngine";

describe("AI STAR Bullet Rewriter Engine (app/lib/starRewriterEngine.ts)", () => {
    describe("Prompt Construction", () => {
        it("includes bullet point, target role, and STAR rules in prompt", () => {
            const prompt = prepareStarRewriterPrompt({
                bulletPoint: "Built user login system and payment gateway.",
                targetRole: "Senior Backend Engineer",
                tonePreference: "technical-depth",
            });

            expect(prompt).toContain("Built user login system and payment gateway.");
            expect(prompt).toContain("Senior Backend Engineer");
            expect(prompt).toContain("Accomplished [X] as measured by [Y], by doing [Z]");
            expect(prompt).toContain("technical-depth");
            expect(prompt).toContain("Situation");
            expect(prompt).toContain("Task");
            expect(prompt).toContain("Action");
            expect(prompt).toContain("Result");
        });

        it("returns appropriate tone guideline for various tones", () => {
            expect(getStarToneGuideline("leadership")).toContain("Leadership & Orchestration");
            expect(getStarToneGuideline("technical")).toContain("Technical Depth & Architecture");
            expect(getStarToneGuideline("metrics")).toContain("Metrics-Focused");
            expect(getStarToneGuideline("executive")).toContain("Executive & Business Impact");
            expect(getStarToneGuideline("action-oriented")).toContain("Action-Oriented");
        });
    });

    describe("validateStarRewriteResult()", () => {
        it("returns true for well-structured STAR responses", () => {
            const valid = {
                critique: "Needs metrics.",
                variants: [
                    {
                        fullBullet: "Spearheaded auth migration reducing latency by 45%.",
                        starBreakdown: {
                            situation: "Legacy auth was slow.",
                            task: "Modernize identity provider.",
                            action: "Integrated OAuth 2.0 with Redis caching.",
                            result: "Cut latency by 45%.",
                            metrics: ["45%"],
                        },
                    },
                ],
            };
            expect(validateStarRewriteResult(valid)).toBe(true);
        });

        it("returns false for null, empty variants, or missing star fields", () => {
            expect(validateStarRewriteResult(null)).toBe(false);
            expect(validateStarRewriteResult({})).toBe(false);
            expect(validateStarRewriteResult({ variants: [] })).toBe(false);
            expect(
                validateStarRewriteResult({
                    variants: [{ fullBullet: "Just a bullet without breakdown" }],
                })
            ).toBe(false);
        });
    });

    describe("rewriteBulletWithStar()", () => {
        it("rejects input bullet points under 5 characters", async () => {
            const mockAi = vi.fn();
            await expect(
                rewriteBulletWithStar(mockAi, { bulletPoint: "fix" })
            ).rejects.toThrow("at least 5 characters");
        });

        it("calls puterAiChat and returns structured StarRewriteResult with 3 variants", async () => {
            const mockResponse = {
                message: {
                    content: JSON.stringify({
                        originalBullet: "Managed AWS infrastructure and reduced cloud bill.",
                        critique: "Lacked exact dollar amounts and specific architectural initiatives.",
                        variants: [
                            {
                                id: "variant-1",
                                type: "action-oriented",
                                fullBullet: "Orchestrated cloud infrastructure consolidation across 18 EC2 clusters, saving $65K annually.",
                                starBreakdown: {
                                    situation: "Unused AWS compute instances caused cost overruns.",
                                    task: "Audit resources and implement auto-scaling policies.",
                                    action: "Migrated workloads to Spot Instances and AWS Fargate.",
                                    result: "Reduced monthly AWS expenditures by 28% ($65K/yr).",
                                    metrics: ["$65K", "28%"],
                                },
                                explanation: "Emphasizes action verbs and immediate cost savings.",
                            },
                            {
                                id: "variant-2",
                                type: "metrics-focused",
                                fullBullet: "Slashed annual AWS cloud overhead by $65,000 (28%) by right-sizing 120+ unreserved instances.",
                                starBreakdown: {
                                    situation: "Underutilized reservations.",
                                    task: "Eliminate idle capacity.",
                                    action: "Enforced Karpenter dynamic cluster provisioning.",
                                    result: "Achieved $65,000 in direct cloud OPEX savings.",
                                    metrics: ["$65,000", "28%"],
                                },
                                explanation: "Puts dollar ROI first.",
                            },
                            {
                                id: "variant-3",
                                type: "technical-depth",
                                fullBullet: "Architected Infrastructure-as-Code pipeline using Terraform and Kubernetes Karpenter, achieving sub-minute cluster scaling.",
                                starBreakdown: {
                                    situation: "Manual cloud deployments created configuration drift.",
                                    task: "Standardize IaC practices across engineering squads.",
                                    action: "Built reusable Terraform modules and GitOps CD.",
                                    result: "Standardized 100% of cloud resources with zero drift.",
                                    metrics: ["100%"],
                                },
                                explanation: "Highlights modern IaC and container tooling.",
                            },
                        ],
                    }),
                },
            };

            const mockAi = vi.fn().mockResolvedValue(mockResponse);

            const result = await rewriteBulletWithStar(mockAi, {
                bulletPoint: "Managed AWS infrastructure and reduced cloud bill.",
                targetRole: "DevOps Engineer",
                tonePreference: "action-oriented",
            });

            expect(mockAi).toHaveBeenCalled();
            expect(result.id).toBeDefined();
            expect(result.variants.length).toBe(3);
            expect(result.variants[0].fullBullet).toContain("Orchestrated cloud infrastructure");
            expect(result.variants[0].starBreakdown.metrics).toContain("$65K");
            expect(result.critique).toContain("Lacked exact dollar amounts");
        });

        it("handles markdown code block wrappers around JSON output", async () => {
            const rawContent = "```json\n" + JSON.stringify({
                originalBullet: "Wrote unit tests.",
                critique: "No coverage percentage.",
                variants: [
                    {
                        id: "v1",
                        type: "action-oriented",
                        fullBullet: "Boosted code coverage from 52% to 94% across 8 repositories by authoring 450+ Vitest tests.",
                        starBreakdown: {
                            situation: "Regression bugs reaching production.",
                            task: "Enforce test coverage gating in CI/CD.",
                            action: "Implemented integration and unit tests with Vitest and MSW.",
                            result: "Cut post-release bug escapes by 60%.",
                            metrics: ["94%", "450+"],
                        },
                        explanation: "Demonstrates tangible quality improvements.",
                    },
                ],
            }) + "\n```";

            const mockAi = vi.fn().mockResolvedValue({
                message: { content: rawContent },
            });

            const result = await rewriteBulletWithStar(mockAi, {
                bulletPoint: "Wrote unit tests.",
            });

            expect(result.variants.length).toBe(1);
            expect(result.variants[0].fullBullet).toContain("Boosted code coverage");
        });
    });
});
