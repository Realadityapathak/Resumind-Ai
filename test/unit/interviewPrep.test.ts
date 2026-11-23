import { describe, it, expect, vi } from "vitest";
import { prepareInterviewPrepPrompt } from "~/features/interview-prep/prompt";
import {
    validateInterviewQuestions,
    getDefaultInterviewQuestions,
    generateInterviewPrep,
} from "~/features/interview-prep/interviewPrepEngine";

describe("Interview Prep Engine (app/lib/interviewPrepEngine.ts)", () => {
    describe("prepareInterviewPrepPrompt()", () => {
        it("constructs comprehensive prompt with role, company, resume, and JD", () => {
            const prompt = prepareInterviewPrepPrompt({
                resumeText: "Jane Doe Senior Backend Engineer with 8 years distributed systems experience in Go and Rust.",
                jobTitle: "Staff Infrastructure Engineer",
                companyName: "Cloudflare",
                jobDescription: "Architect high-throughput edge proxies and DDoS mitigation engines.",
            });

            expect(prompt).toContain("Staff Infrastructure Engineer");
            expect(prompt).toContain("Cloudflare");
            expect(prompt).toContain("Jane Doe Senior Backend Engineer");
            expect(prompt).toContain("Architect high-throughput edge proxies");
            expect(prompt).toContain("recruiterIntent");
            expect(prompt).toContain("starModelAnswer");
            expect(prompt).toContain("pitfallsToAvoid");
            expect(prompt).toContain("behavioral");
            expect(prompt).toContain("technical");
            expect(prompt).toContain("situational");
        });
    });

    describe("validateInterviewQuestions()", () => {
        it("validates compliant question collections", () => {
            const valid = {
                questions: [
                    {
                        category: "behavioral",
                        question: "Tell me about a time you resolved a major production outage.",
                        recruiterIntent: "Evaluates incident response and communication under stress.",
                        resumeAnchor: "Anchored to your experience at Cloudflare.",
                        starModelAnswer: {
                            situation: "Edge proxy started dropping 15% of packets.",
                            task: "Identify failure mode and restore packet flow.",
                            action: "Rolled back faulty BGP route configuration.",
                            result: "Full service restored within 3 minutes.",
                            fullAnswer: "When edge proxies began dropping packets...",
                        },
                        pitfallsToAvoid: ["Blaming teammates", "Omitting metrics"],
                    },
                ],
            };

            expect(validateInterviewQuestions(valid)).toBe(true);
        });

        it("rejects non-object, empty, or incomplete question objects", () => {
            expect(validateInterviewQuestions(null)).toBe(false);
            expect(validateInterviewQuestions(undefined)).toBe(false);
            expect(validateInterviewQuestions({})).toBe(false);
            expect(validateInterviewQuestions({ questions: [] })).toBe(false);
            expect(validateInterviewQuestions({ questions: [{ question: "No recruiter intent" }] })).toBe(false);
            expect(validateInterviewQuestions({
                questions: [{
                    question: "Question text",
                    recruiterIntent: "Intent",
                    // missing starModelAnswer
                }],
            })).toBe(false);
        });
    });

    describe("getDefaultInterviewQuestions()", () => {
        it("provides deterministic fallback questions tailored with role and company", () => {
            const fallbacks = getDefaultInterviewQuestions("Staff Architect", "Netflix");
            expect(fallbacks).toHaveLength(3);

            const categories = fallbacks.map(q => q.category);
            expect(categories).toContain("behavioral");
            expect(categories).toContain("technical");
            expect(categories).toContain("situational");

            expect(fallbacks[0].resumeAnchor).toContain("Staff Architect");
            expect(fallbacks[0].resumeAnchor).toContain("Netflix");
            expect(fallbacks[0].starModelAnswer.situation).toMatch(/your own/i);
            expect(fallbacks[0].starModelAnswer.fullAnswer).toMatch(/your own/i);
            fallbacks.forEach((question) => {
                expect(question.starModelAnswer.fullAnswer).not.toMatch(
                    /\bI (led|architected|built|shipped|reduced|slashed)\b/i
                );
            });
            expect(fallbacks[0].pitfallsToAvoid.length).toBeGreaterThan(0);
        });
    });

    describe("generateInterviewPrep() with Puter AI", () => {
        it("invokes AI chat and maps questions into complete InterviewPrepSection", async () => {
            const mockChat = vi.fn().mockResolvedValue({
                message: {
                    content: JSON.stringify({
                        questions: [
                            {
                                id: "q-ai-1",
                                category: "technical",
                                question: "Explain how you scale Redis clusters across multiple availability zones.",
                                recruiterIntent: "Tests distributed cache partitioning and consistency trade-offs.",
                                resumeAnchor: "Anchored to your Redis scaling bullet point.",
                                starModelAnswer: {
                                    situation: "Redis memory utilization reached 92% during peak.",
                                    task: "Partition cluster across 3 AZs with read replicas.",
                                    action: "Implemented consistent hashing and twemproxy layer.",
                                    result: "Reduced peak memory to 48% with zero downtime.",
                                    fullAnswer: "When our cache hit memory limits...",
                                },
                                pitfallsToAvoid: ["Ignoring split-brain risk", "Not calculating replication lag"],
                            },
                        ],
                    }),
                },
            });

            const result = await generateInterviewPrep(mockChat, {
                resumeText: "Senior Distributed Systems Engineer with 8 years building caching solutions in Go.",
                jobTitle: "Senior Systems Engineer",
                companyName: "Stripe",
            });

            expect(result).toBeDefined();
            expect(result.targetRole).toBe("Senior Systems Engineer");
            expect(result.companyName).toBe("Stripe");
            expect(result.questions).toHaveLength(1);
            expect(result.questions[0].category).toBe("technical");
            expect(result.questions[0].question).toContain("Redis");
            expect(result.questions[0].starModelAnswer.result).toContain("Reduced peak memory");
            expect(mockChat).toHaveBeenCalledOnce();
        });

        it("throws an error if resumeText is under 50 characters", async () => {
            const mockChat = vi.fn();
            await expect(
                generateInterviewPrep(mockChat, {
                    resumeText: "Too short resume text",
                    jobTitle: "Engineer",
                    companyName: "Acme",
                })
            ).rejects.toThrow(/Resume content is too short to generate tailored interview questions/i);
            expect(mockChat).not.toHaveBeenCalled();
        });

        it("throws an error if AI returns malformed JSON", async () => {
            const mockChat = vi.fn().mockResolvedValue({
                message: {
                    content: "Invalid unparsed text response from AI",
                },
            });

            await expect(
                generateInterviewPrep(mockChat, {
                    resumeText: "Comprehensive resume text with sufficient length for testing interview prep generation.",
                    jobTitle: "Engineer",
                    companyName: "Acme",
                })
            ).rejects.toThrow(/Failed to parse valid interview questions from AI response/i);
        });

        it("throws an error if AI chat rejects", async () => {
            const mockChat = vi.fn().mockRejectedValue(new Error("AI service quota reached"));

            await expect(
                generateInterviewPrep(mockChat, {
                    resumeText: "Comprehensive resume text with sufficient length for testing interview prep generation.",
                    jobTitle: "Engineer",
                    companyName: "Acme",
                })
            ).rejects.toThrow("AI service quota reached");
        });
    });
});
