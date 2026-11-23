import { describe, it, expect, vi } from "vitest";
import { prepareCoverLetterPrompt, getCoverLetterToneGuideline } from "~/features/cover-letter/prompt";
import {
    validateCoverLetterResponse,
    calculateWordCount,
    calculateReadingTimeMinutes,
    assembleFullCoverLetterText,
    generateCoverLetter,
} from "~/features/cover-letter/coverLetterEngine";

describe("Cover Letter Engine (app/lib/coverLetterEngine.ts)", () => {
    describe("Prompt Generation & Tone Guidelines", () => {
        it("constructs prompt containing resume text, target role, company, and JD", () => {
            const prompt = prepareCoverLetterPrompt({
                resumeText: "Jane Doe Senior Full-Stack Engineer with 7 years React and Node experience.",
                jobTitle: "Principal Frontend Architect",
                companyName: "Stripe",
                jobDescription: "Lead design system and scalable micro-frontends.",
                tone: "executive",
            });

            expect(prompt).toContain("Jane Doe Senior Full-Stack Engineer");
            expect(prompt).toContain("Principal Frontend Architect");
            expect(prompt).toContain("Stripe");
            expect(prompt).toContain("Lead design system and scalable micro-frontends.");
            expect(prompt).toContain("Executive & Strategic");
            expect(prompt).toContain("subjectLine");
            expect(prompt).toContain("hookParagraph");
        });

        it("returns specialized guidelines for each supported tone", () => {
            expect(getCoverLetterToneGuideline("professional")).toContain("Professional & Polished");
            expect(getCoverLetterToneGuideline("passionate")).toContain("Passionate & Mission-Driven");
            expect(getCoverLetterToneGuideline("executive")).toContain("Executive & Strategic");
            expect(getCoverLetterToneGuideline("conversational")).toContain("Conversational & Personable");
            expect(getCoverLetterToneGuideline("unknown" as CoverLetterTone)).toContain("Professional & Polished");
        });
    });

    describe("Utility Calculations", () => {
        it("calculates word count accurately across spaces and line breaks", () => {
            expect(calculateWordCount("")).toBe(0);
            expect(calculateWordCount("   \n\t  ")).toBe(0);
            expect(calculateWordCount("Hello world! This is a test.")).toBe(6);
            expect(calculateWordCount("Word1   Word2\nWord3\r\nWord4")).toBe(4);
        });

        it("calculates reading time in whole minutes based on word count", () => {
            expect(calculateReadingTimeMinutes(0)).toBe(0);
            expect(calculateReadingTimeMinutes(50)).toBe(1);
            expect(calculateReadingTimeMinutes(450)).toBe(3);
        });

        it("assembles full formatted cover letter text from parts", () => {
            const full = assembleFullCoverLetterText({
                subjectLine: "Application for Staff Engineer - Stripe",
                salutation: "Dear Hiring Team,",
                hookParagraph: "I am writing to express my strong enthusiasm for the Staff Engineer role.",
                bodyParagraphs: [
                    "At Acme Corp, I led the migration to modern architecture.",
                    "Additionally, I mentored 12 engineers across 3 distributed pods.",
                ],
                closingParagraph: "I welcome the opportunity to discuss how my background aligns with your vision.",
                signOff: "Sincerely,\nJane Doe",
            });

            expect(full).toContain("Application for Staff Engineer - Stripe");
            expect(full).toContain("Dear Hiring Team,");
            expect(full).toContain("At Acme Corp, I led the migration");
            expect(full).toContain("Additionally, I mentored 12 engineers");
            expect(full).toContain("Sincerely,\nJane Doe");
        });
    });

    describe("validateCoverLetterResponse()", () => {
        it("validates well-formed cover letter JSON objects", () => {
            const valid = {
                subjectLine: "Application for Frontend Lead",
                salutation: "Dear Stripe Team,",
                hookParagraph: "Excited to apply.",
                bodyParagraphs: ["Paragraph 1", "Paragraph 2"],
                closingParagraph: "Looking forward to speaking.",
                signOff: "Best regards, Alex",
            };
            expect(validateCoverLetterResponse(valid)).toBe(true);
        });

        it("rejects invalid, null, or incomplete responses", () => {
            expect(validateCoverLetterResponse(null)).toBe(false);
            expect(validateCoverLetterResponse(undefined)).toBe(false);
            expect(validateCoverLetterResponse("plain string")).toBe(false);
            expect(validateCoverLetterResponse({ subjectLine: "Only subject" })).toBe(false);
            expect(validateCoverLetterResponse({
                subjectLine: "Subject",
                salutation: "Salutation",
                hookParagraph: "Hook",
                bodyParagraphs: [],
                closingParagraph: "Closing",
                signOff: "SignOff",
            })).toBe(false);
        });
    });

    describe("generateCoverLetter() with Puter AI", () => {
        it("successfully invokes AI and constructs complete CoverLetter record", async () => {
            const mockChat = vi.fn().mockResolvedValue({
                message: {
                    content: JSON.stringify({
                        subjectLine: "Application for Senior Engineer",
                        salutation: "Dear Hiring Team,",
                        hookParagraph: "I am thrilled to apply.",
                        bodyParagraphs: ["Body 1 with achievements.", "Body 2 with leadership."],
                        closingParagraph: "Thank you for your consideration.",
                        signOff: "Warm regards,\nCandidate",
                    }),
                },
            });

            const result = await generateCoverLetter(mockChat, {
                resumeText: "Sample resume text with 5 years experience across software engineering.",
                jobTitle: "Senior Engineer",
                companyName: "Vercel",
                tone: "passionate",
            });

            expect(result).toBeDefined();
            expect(result.id).toBeTruthy();
            expect(typeof result.id).toBe("string");
            expect(result.tone).toBe("passionate");
            expect(result.jobTitle).toBe("Senior Engineer");
            expect(result.companyName).toBe("Vercel");
            expect(result.subjectLine).toBe("Application for Senior Engineer");
            expect(result.wordCount).toBeGreaterThan(0);
            expect(result.readingTimeMinutes).toBeGreaterThanOrEqual(1);
            expect(result.fullText).toContain("Application for Senior Engineer");
            expect(mockChat).toHaveBeenCalledOnce();
        });

        it("throws an error when AI returns malformed JSON", async () => {
            const mockChat = vi.fn().mockResolvedValue({
                message: {
                    content: "Sorry, I cannot generate this at the moment.",
                },
            });

            await expect(
                generateCoverLetter(mockChat, {
                    resumeText: "Valid length resume text exceeding twenty characters for testing.",
                    jobTitle: "Role",
                    companyName: "Company",
                    tone: "professional",
                })
            ).rejects.toThrow(/Failed to parse structured cover letter from AI response/i);
        });

        it("throws an error when AI chat promise rejects", async () => {
            const mockChat = vi.fn().mockRejectedValue(new Error("Network connection lost"));

            await expect(
                generateCoverLetter(mockChat, {
                    resumeText: "Valid length resume text exceeding twenty characters for testing.",
                    jobTitle: "Role",
                    companyName: "Company",
                    tone: "professional",
                })
            ).rejects.toThrow("Network connection lost");
        });

        it("throws an error if resumeText is too short", async () => {
            const mockChat = vi.fn();
            await expect(
                generateCoverLetter(mockChat, {
                    resumeText: "Too short",
                    jobTitle: "Role",
                    companyName: "Company",
                    tone: "professional",
                })
            ).rejects.toThrow(/Resume content is too short or missing/i);
            expect(mockChat).not.toHaveBeenCalled();
        });
    });
});
