import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
    prepareCoverLetterPrompt,
    getCoverLetterToneGuideline,
} from "~/features/cover-letter/prompt";
import {
    validateCoverLetterResponse,
    calculateWordCount,
    calculateReadingTimeMinutes,
    assembleFullCoverLetterText,
    generateCoverLetter,
} from "~/features/cover-letter/coverLetterEngine";
import { CoverLetterTab, TONES } from "~/features/cover-letter/CoverLetterTab";
import { usePuterStore } from "~/services/puter/store";

type TestWindow = Window & {
    __hacked?: boolean;
    __imgHacked?: boolean;
};

vi.mock("~/services/puter/store", () => ({
    usePuterStore: vi.fn(),
}));

describe("M4 Challenger 1: Adversarial Stress & Resiliency Test Suite", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const chat = vi.fn();

        (usePuterStore as any).mockImplementation(() => ({
            ai: {
                chat,
            },
        }));
    });

    describe("1. Extreme & Adversarial Inputs", () => {
        it("handles massive 10,000-word job descriptions without blowing up stack or timing out", () => {
            const massiveJd = Array(10000).fill("scalable microservices cloud infrastructure").join(" ");
            const resume = "Experienced Staff Software Engineer with 10 years experience building distributed platforms.";

            const prompt = prepareCoverLetterPrompt({
                resumeText: resume,
                jobTitle: "Principal Infrastructure Architect",
                companyName: "HyperScale Cloud Inc.",
                jobDescription: massiveJd,
                tone: "executive",
            });

            expect(prompt).toBeDefined();
            expect(prompt.length).toBeGreaterThan(50000);
            expect(prompt).toContain("HyperScale Cloud Inc.");
            expect(prompt).toContain("Executive & Strategic");
            expect(prompt).toContain("scalable microservices cloud infrastructure");
        });

        it("safely handles HTML and script injection vectors in role, company, JD, and notes", () => {
            const xssJobTitle = '<script>alert("PWNED_TITLE")</script>';
            const xssCompany = '<img src="x" onerror="alert(document.cookie)">';
            const xssJd = '<svg onload=alert(1)>Job description with "quotes" and \\backslashes\\';
            const xssNotes = "Candidate instructions: `rm -rf /` and {{7*7}} and <iframe src='evil.com'></iframe>";

            const prompt = prepareCoverLetterPrompt({
                resumeText: "Valid software engineer resume with 5 years experience.",
                jobTitle: xssJobTitle,
                companyName: xssCompany,
                jobDescription: xssJd,
                customNotes: xssNotes,
                tone: "passionate",
            });

            expect(prompt).toContain(xssJobTitle);
            expect(prompt).toContain(xssCompany);
            expect(prompt).toContain(xssJd);
            expect(prompt).toContain(xssNotes);
            // Verify quotes in companyName and jobTitle are escaped in the JSON schema template
            expect(prompt).toContain(`"roleTitle": "${xssJobTitle.replace(/"/g, '\\"')}"`);
            expect(prompt).toContain(`"companyName": "${xssCompany.replace(/"/g, '\\"')}"`);
        });

        it("handles diverse non-ASCII, CJK, Arabic RTL, accent marks, and emojis gracefully", () => {
            const internationalResume =
                "👨‍💻 Senior Développeur & Full-Stack 工程师. خبرة 10 سنوات في هندسة البرمجيات. 🚀🔥 Specializing in React, TypeScript, and AI agents. (東京 & Zürich).";
            const internationalTitle = "Senior Full-Stack 工程师 🚀";
            const internationalCompany = "Société Générale & 楽天株式会社";

            const prompt = prepareCoverLetterPrompt({
                resumeText: internationalResume,
                jobTitle: internationalTitle,
                companyName: internationalCompany,
                tone: "conversational",
            });

            expect(prompt).toContain(internationalResume);
            expect(prompt).toContain(internationalTitle);
            expect(prompt).toContain(internationalCompany);
            expect(prompt).toContain("Conversational & Personable");
        });

        it("enforces strict resume length boundary (rejects 19 chars, accepts 20 chars)", async () => {
            const mockAi = vi.fn();

            await expect(
                generateCoverLetter(mockAi, {
                    resumeText: "1234567890123456789",
                    jobTitle: "Engineer",
                    companyName: "Acme",
                })
            ).rejects.toThrow(/Resume content is too short or missing/i);

            mockAi.mockResolvedValueOnce({
                message: {
                    content: JSON.stringify({
                        subjectLine: "Application for Engineer",
                        salutation: "Dear Acme Team,",
                        hookParagraph: "I am writing to apply.",
                        bodyParagraphs: ["Body 1 with 20 chars resume."],
                        closingParagraph: "Thanks for reading.",
                        signOff: "Sincerely, Me",
                    }),
                },
            });

            const result = await generateCoverLetter(mockAi, {
                resumeText: "12345678901234567890",
                jobTitle: "Engineer",
                companyName: "Acme",
            });

            expect(result).toBeDefined();
            expect(result.subjectLine).toBe("Application for Engineer");
            expect(mockAi).toHaveBeenCalledOnce();
        });

        it("handles null / undefined / empty string fallback options in prepareCoverLetterPrompt", () => {
            const prompt = prepareCoverLetterPrompt({
                resumeText: "Alex Rivera Staff Engineer with 8 years experience building distributed financial pipelines.",
                jobTitle: undefined,
                companyName: undefined,
                jobDescription: "",
                customNotes: "",
                tone: undefined,
                userProfile: undefined,
            });

            expect(prompt).toContain("Software Engineering Professional");
            expect(prompt).toContain("Target Company");
            expect(prompt).toContain("Professional & Polished");
            expect(prompt).toContain("Not provided. Ground the letter in standard industry requirements");
        });
    });

    describe("2. Validation Resilience & Malformed AI Output", () => {
        it("rejects non-object, null, and primitive inputs in validateCoverLetterResponse", () => {
            expect(validateCoverLetterResponse(null)).toBe(false);
            expect(validateCoverLetterResponse(undefined)).toBe(false);
            expect(validateCoverLetterResponse(12345)).toBe(false);
            expect(validateCoverLetterResponse(true)).toBe(false);
            expect(validateCoverLetterResponse("plain string")).toBe(false);
            expect(validateCoverLetterResponse([])).toBe(false);
        });

        it("rejects cover letter schemas with missing or whitespace-only mandatory fields", () => {
            const baseline = {
                subjectLine: "Application for Staff Engineer",
                salutation: "Dear Hiring Team,",
                hookParagraph: "Strong interest in joining.",
                bodyParagraphs: ["Paragraph 1", "Paragraph 2"],
                closingParagraph: "Looking forward to hearing from you.",
                signOff: "Sincerely, Alex",
            };

            expect(validateCoverLetterResponse({ ...baseline, subjectLine: "" })).toBe(false);
            expect(validateCoverLetterResponse({ ...baseline, subjectLine: "   \t\n  " })).toBe(false);
            expect(validateCoverLetterResponse({ ...baseline, subjectLine: null })).toBe(false);

            expect(validateCoverLetterResponse({ ...baseline, salutation: "" })).toBe(false);
            expect(validateCoverLetterResponse({ ...baseline, salutation: "  " })).toBe(false);

            expect(validateCoverLetterResponse({ ...baseline, hookParagraph: "" })).toBe(false);
            expect(validateCoverLetterResponse({ ...baseline, hookParagraph: "   " })).toBe(false);

            expect(validateCoverLetterResponse({ ...baseline, bodyParagraphs: [] })).toBe(false);
            expect(validateCoverLetterResponse({ ...baseline, bodyParagraphs: [""] })).toBe(false);
            expect(validateCoverLetterResponse({ ...baseline, bodyParagraphs: ["Valid", "  \n "] })).toBe(false);
            expect(validateCoverLetterResponse({ ...baseline, bodyParagraphs: ["Valid", 12345] })).toBe(false);
            expect(validateCoverLetterResponse({ ...baseline, bodyParagraphs: "Not an array" })).toBe(false);

            expect(validateCoverLetterResponse({ ...baseline, closingParagraph: "" })).toBe(false);
            expect(validateCoverLetterResponse({ ...baseline, closingParagraph: "   " })).toBe(false);

            expect(validateCoverLetterResponse({ ...baseline, signOff: "" })).toBe(false);
            expect(validateCoverLetterResponse({ ...baseline, signOff: "   " })).toBe(false);
        });

        it("strips triple backtick markdown fences (```json ... ```) and parses cleanly", async () => {
            const fencedJson = "```json\n" + JSON.stringify({
                subjectLine: "Application for Staff Engineer",
                salutation: "Dear Hiring Team,",
                hookParagraph: "Excited to apply.",
                bodyParagraphs: ["Delivered high availability payment pipeline."],
                closingParagraph: "Looking forward to interview.",
                signOff: "Best regards, Alex",
            }) + "\n```";

            const mockAi = vi.fn().mockResolvedValue({
                message: { content: fencedJson },
            });

            const result = await generateCoverLetter(mockAi, {
                resumeText: "Software Engineer with full-stack development experience exceeding twenty characters.",
                jobTitle: "Staff Engineer",
                companyName: "Stripe",
            });

            expect(result.subjectLine).toBe("Application for Staff Engineer");
            expect(result.bodyParagraphs).toHaveLength(1);
        });

        it("handles multi-part array content in response.message.content", async () => {
            const mockAi = vi.fn().mockResolvedValue({
                message: {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                subjectLine: "Application from multi-part array",
                                salutation: "Dear Hiring Team,",
                                hookParagraph: "Multi-part array payload test.",
                                bodyParagraphs: ["Body 1"],
                                closingParagraph: "Closing 1",
                                signOff: "SignOff 1",
                            }),
                        },
                    ],
                },
            });

            const result = await generateCoverLetter(mockAi, {
                resumeText: "Software Engineer with full-stack development experience exceeding twenty characters.",
                jobTitle: "Staff Engineer",
                companyName: "Stripe",
            });

            expect(result.subjectLine).toBe("Application from multi-part array");
        });

        it("throws clean error when AI response message is null or empty", async () => {
            const mockAiEmpty = vi.fn().mockResolvedValue(null);
            await expect(
                generateCoverLetter(mockAiEmpty, {
                    resumeText: "Software Engineer with full-stack development experience exceeding twenty characters.",
                })
            ).rejects.toThrow(/Puter AI returned an empty or invalid response/i);

            const mockAiNoMessage = vi.fn().mockResolvedValue({});
            await expect(
                generateCoverLetter(mockAiNoMessage, {
                    resumeText: "Software Engineer with full-stack development experience exceeding twenty characters.",
                })
            ).rejects.toThrow(/Puter AI returned an empty or invalid response/i);
        });

        it("assembles fullText automatically when AI omits or returns short fullText", async () => {
            const mockAi = vi.fn().mockResolvedValue({
                message: {
                    content: JSON.stringify({
                        subjectLine: "Application for Architect",
                        salutation: "Dear Team,",
                        hookParagraph: "Hook paragraph text.",
                        bodyParagraphs: ["Body paragraph 1.", "Body paragraph 2."],
                        closingParagraph: "Closing paragraph text.",
                        signOff: "Sincerely, Jane",
                        fullText: "Short",
                    }),
                },
            });

            const result = await generateCoverLetter(mockAi, {
                resumeText: "Software Engineer with full-stack development experience exceeding twenty characters.",
                jobTitle: "Architect",
                companyName: "Acme",
            });

            expect(result.fullText.length).toBeGreaterThan(50);
            expect(result.fullText).toContain("Application for Architect");
            expect(result.fullText).toContain("Hook paragraph text.");
            expect(result.fullText).toContain("Body paragraph 1.");
            expect(result.fullText).toContain("Body paragraph 2.");
            expect(result.fullText).toContain("Closing paragraph text.");
            expect(result.fullText).toContain("Sincerely, Jane");
        });
    });

    describe("3. Word Count & Reading Time Calculations", () => {
        it("calculates word count accurately for empty, whitespace, and single words", () => {
            expect(calculateWordCount("")).toBe(0);
            expect(calculateWordCount("   ")).toBe(0);
            expect(calculateWordCount("\n\n\t  \r\n")).toBe(0);
            expect(calculateWordCount("SingleWord")).toBe(1);
            expect(calculateWordCount("   Leading and trailing whitespace   ")).toBe(4);
        });

        it("handles unicode whitespace, tabs, and non-breaking spaces", () => {
            const unicodeText = "WordOne\u00A0WordTwo\u2003WordThree\tWordFour\nWordFive";
            expect(calculateWordCount(unicodeText)).toBe(5);
        });

        it("calculates massive word count of 10,000 words without degradation", () => {
            const words = Array(10000).fill("metric").join(" ");
            const count = calculateWordCount(words);
            expect(count).toBe(10000);

            const readTime = calculateReadingTimeMinutes(count);
            expect(readTime).toBe(50);
        });

        it("handles punctuation-only and special symbol tokens", () => {
            expect(calculateWordCount("--- ... !!! ???")).toBe(4);
            expect(calculateWordCount("🚀 🔥 💻 👨‍💻")).toBe(4);
        });

        it("calculates reading time boundary conditions", () => {
            expect(calculateReadingTimeMinutes(-10)).toBe(0);
            expect(calculateReadingTimeMinutes(0)).toBe(0);
            expect(calculateReadingTimeMinutes(1)).toBe(1);
            expect(calculateReadingTimeMinutes(199)).toBe(1);
            expect(calculateReadingTimeMinutes(200)).toBe(1);
            expect(calculateReadingTimeMinutes(201)).toBe(2);
            expect(calculateReadingTimeMinutes(400)).toBe(2);
            expect(calculateReadingTimeMinutes(401)).toBe(3);
        });

        it("assembles full text cleanly with multiple paragraphs and double-newline separation", () => {
            const assembled = assembleFullCoverLetterText({
                subjectLine: "Subject Line",
                salutation: "Salutation,",
                hookParagraph: "Hook",
                bodyParagraphs: ["Body 1", "Body 2", "Body 3"],
                closingParagraph: "Closing",
                signOff: "SignOff",
            });

            const expected = "Subject Line\n\nSalutation,\n\nHook\n\nBody 1\n\nBody 2\n\nBody 3\n\nClosing\n\nSignOff";
            expect(assembled).toBe(expected);
        });
    });

    describe("4. Tone Guidelines Coverage for all 4 Tones", () => {
        it("returns the exact strategic voice guidance for each of the 4 supported tones", () => {
            const professional = getCoverLetterToneGuideline("professional");
            expect(professional).toContain("Professional & Polished");
            expect(professional).toContain("authoritative business communication");

            const passionate = getCoverLetterToneGuideline("passionate");
            expect(passionate).toContain("Passionate & Mission-Driven");
            expect(passionate).toContain("high energy, authentic excitement");

            const executive = getCoverLetterToneGuideline("executive");
            expect(executive).toContain("Executive & Strategic");
            expect(executive).toContain("macro-level business perspective, focusing on ROI");

            const conversational = getCoverLetterToneGuideline("conversational");
            expect(conversational).toContain("Conversational & Personable");
            expect(conversational).toContain("Warm, direct, authentic human voice");
        });

        it("falls back safely to Professional for invalid, null, or undefined tones", () => {
            expect(getCoverLetterToneGuideline(undefined)).toContain("Professional & Polished");
            expect(getCoverLetterToneGuideline(null as any)).toContain("Professional & Polished");
            expect(getCoverLetterToneGuideline("pirate" as any)).toContain("Professional & Polished");
            expect(getCoverLetterToneGuideline("" as any)).toContain("Professional & Polished");
        });

        it("verifies all 4 tone definitions in TONES constant have labels and non-empty descriptions", () => {
            expect(TONES).toHaveLength(4);
            const toneIds = TONES.map((t) => t.id);
            expect(toneIds).toEqual(["professional", "passionate", "executive", "conversational"]);

            TONES.forEach((tone) => {
                expect(tone.label.length).toBeGreaterThan(0);
                expect(tone.description.length).toBeGreaterThan(20);
            });
        });
    });

    describe("5. Exporters, Blob URL Creation & Revocation Sanity", () => {
        let createObjectURLMock: Mock<typeof URL.createObjectURL>;
        let revokeObjectURLMock: Mock<typeof URL.revokeObjectURL>;
        let anchorClickMock: Mock<HTMLAnchorElement["click"]>;

        beforeEach(() => {
            vi.useFakeTimers();
            createObjectURLMock = vi.fn<typeof URL.createObjectURL>(() => `blob:mock-url-${Math.random()}`);
            revokeObjectURLMock = vi.fn<typeof URL.revokeObjectURL>();
            anchorClickMock = vi.fn<HTMLAnchorElement["click"]>();

            window.URL.createObjectURL = createObjectURLMock;
            window.URL.revokeObjectURL = revokeObjectURLMock;
            HTMLAnchorElement.prototype.click = anchorClickMock;
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("creates Blob, triggers download, and cleanly revokes ObjectURL via timer (no memory leak)", async () => {
            const letterText = "This is a confidential and complete cover letter for testing export.";
            const testLetter: CoverLetter = {
                id: "letter-exp-1",
                jobTitle: "Principal Architect",
                companyName: "Acme Cloud",
                tone: "professional",
                subjectLine: "Application for Principal Architect",
                salutation: "Dear Acme Team,",
                hookParagraph: "Hook",
                bodyParagraphs: ["Body 1"],
                closingParagraph: "Closing",
                signOff: "SignOff",
                fullText: letterText,
                wordCount: 10,
                readingTimeMinutes: 1,
                createdAt: new Date().toISOString(),
            };

            render(
                React.createElement(CoverLetterTab, {
                    resumeId: "resume-123",
                    parsedText: "Alex Rivera Staff Engineer with 8 years experience building distributed financial pipelines.",
                    savedCoverLetters: [testLetter],
                })
            );

            const downloadBtn = screen.getByRole("button", { name: /Download \.txt/i });
            fireEvent.click(downloadBtn);

            expect(createObjectURLMock).toHaveBeenCalledOnce();
            const createdBlob = createObjectURLMock.mock.calls[0][0] as Blob;
            expect(createdBlob).toBeInstanceOf(Blob);
            expect(createdBlob.type).toBe("text/plain;charset=utf-8");

            expect(anchorClickMock).toHaveBeenCalledOnce();

            expect(revokeObjectURLMock).not.toHaveBeenCalled();

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(revokeObjectURLMock).toHaveBeenCalledOnce();
            expect(revokeObjectURLMock).toHaveBeenCalledWith(createObjectURLMock.mock.results[0].value);
        });

        it("sanitizes malicious or unusual company names in the download filename", () => {
            const dirtyCompany = "../../../etc/passwd; rm -rf /; *&^% Special Corp";
            const testLetter: CoverLetter = {
                id: "letter-exp-2",
                jobTitle: "Security Lead",
                companyName: dirtyCompany,
                tone: "professional",
                subjectLine: "Subject",
                salutation: "Salutation",
                hookParagraph: "Hook",
                bodyParagraphs: ["Body"],
                closingParagraph: "Closing",
                signOff: "SignOff",
                fullText: "Cover letter text for security test.",
                wordCount: 6,
                readingTimeMinutes: 1,
                createdAt: new Date().toISOString(),
            };

            let capturedDownloadAttr = "";
            const originalAppendChild = document.body.appendChild;
            vi.spyOn(document.body, "appendChild").mockImplementation((node: Node) => {
                if (node instanceof HTMLAnchorElement) {
                    capturedDownloadAttr = node.download;
                }
                return originalAppendChild.call(document.body, node);
            });

            render(
                React.createElement(CoverLetterTab, {
                    resumeId: "resume-123",
                    companyName: dirtyCompany,
                    savedCoverLetters: [testLetter],
                })
            );

            const downloadBtn = screen.getByRole("button", { name: /Download \.txt/i });
            fireEvent.click(downloadBtn);

            expect(capturedDownloadAttr).toBeDefined();
            expect(capturedDownloadAttr).not.toContain("../");
            expect(capturedDownloadAttr).not.toContain(";");
            expect(capturedDownloadAttr).not.toContain("*");
            expect(capturedDownloadAttr).toContain(".txt");
        });

        it("does NOT trigger download or create Blob when editableText is empty or whitespace", () => {
            render(
                React.createElement(CoverLetterTab, {
                    resumeId: "resume-123",
                    savedCoverLetters: [],
                })
            );

            expect(screen.queryByRole("button", { name: /Download \.txt/i })).not.toBeInTheDocument();
            expect(createObjectURLMock).not.toHaveBeenCalled();
        });

        it("handles multiple sequential downloads without leaking Object URLs", () => {
            const testLetter: CoverLetter = {
                id: "letter-exp-3",
                jobTitle: "DevOps Engineer",
                companyName: "Docker",
                tone: "professional",
                subjectLine: "Subject",
                salutation: "Salutation",
                hookParagraph: "Hook",
                bodyParagraphs: ["Body"],
                closingParagraph: "Closing",
                signOff: "SignOff",
                fullText: "Multi-download stress test letter content.",
                wordCount: 6,
                readingTimeMinutes: 1,
                createdAt: new Date().toISOString(),
            };

            render(
                React.createElement(CoverLetterTab, {
                    resumeId: "resume-123",
                    savedCoverLetters: [testLetter],
                })
            );

            const downloadBtn = screen.getByRole("button", { name: /Download \.txt/i });

            fireEvent.click(downloadBtn);
            fireEvent.click(downloadBtn);
            fireEvent.click(downloadBtn);

            expect(createObjectURLMock).toHaveBeenCalledTimes(3);

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(revokeObjectURLMock).toHaveBeenCalledTimes(3);
        });

        it("invokes window.print when clicking Print / PDF button safely", () => {
            const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

            const testLetter: CoverLetter = {
                id: "letter-print-1",
                jobTitle: "Staff Engineer",
                companyName: "Google",
                tone: "professional",
                subjectLine: "Subject",
                salutation: "Salutation",
                hookParagraph: "Hook",
                bodyParagraphs: ["Body"],
                closingParagraph: "Closing",
                signOff: "SignOff",
                fullText: "Print layout test.",
                wordCount: 3,
                readingTimeMinutes: 1,
                createdAt: new Date().toISOString(),
            };

            render(
                React.createElement(CoverLetterTab, {
                    resumeId: "resume-123",
                    savedCoverLetters: [testLetter],
                })
            );

            const printBtn = screen.getByRole("button", { name: /Print \/ PDF/i });
            fireEvent.click(printBtn);

            expect(printSpy).toHaveBeenCalledOnce();
            printSpy.mockRestore();
        });

        it("handles clipboard write failure without throwing uncaught exceptions", async () => {
            vi.useRealTimers();
            const writeTextMock = vi.fn().mockRejectedValue(new Error("Clipboard permission denied"));
            Object.assign(navigator, {
                clipboard: {
                    writeText: writeTextMock,
                },
            });
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const testLetter: CoverLetter = {
                id: "letter-copy-fail",
                jobTitle: "Staff Engineer",
                companyName: "Apple",
                tone: "professional",
                subjectLine: "Subject",
                salutation: "Salutation",
                hookParagraph: "Hook",
                bodyParagraphs: ["Body"],
                closingParagraph: "Closing",
                signOff: "SignOff",
                fullText: "Clipboard test.",
                wordCount: 2,
                readingTimeMinutes: 1,
                createdAt: new Date().toISOString(),
            };

            render(
                React.createElement(CoverLetterTab, {
                    resumeId: "resume-123",
                    savedCoverLetters: [testLetter],
                })
            );

            const copyBtn = screen.getByRole("button", { name: /1-Click Copy/i });
            fireEvent.click(copyBtn);

            await waitFor(() => {
                expect(writeTextMock).toHaveBeenCalledOnce();
                expect(consoleSpy).toHaveBeenCalledWith("Failed to copy cover letter:", expect.any(Error));
            });

            consoleSpy.mockRestore();
        });
    });

    describe("6. Component Stress, XSS Immunity & State Transitions", () => {
        it("renders hostile script payloads safely in textarea and paper preview without script execution", () => {
            const xssPayload = '<script id="evil-script">window.__hacked = true;</script><img src="invalid" onerror="window.__imgHacked=true" />';

            const testLetter: CoverLetter = {
                id: "letter-xss",
                jobTitle: "Penetration Tester",
                companyName: "Offensive Security",
                tone: "professional",
                subjectLine: "Application for Pentester",
                salutation: "Dear Team,",
                hookParagraph: "Hook",
                bodyParagraphs: ["Body"],
                closingParagraph: "Closing",
                signOff: "SignOff",
                fullText: xssPayload,
                wordCount: 3,
                readingTimeMinutes: 1,
                createdAt: new Date().toISOString(),
            };

            render(
                React.createElement(CoverLetterTab, {
                    resumeId: "resume-123",
                    savedCoverLetters: [testLetter],
                })
            );

            const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i }) as HTMLTextAreaElement;
            expect(textarea.value).toBe(xssPayload);

            const testWindow = window as TestWindow;
            expect(document.getElementById("evil-script")).toBeNull();
            expect(testWindow.__hacked).toBeUndefined();
            expect(testWindow.__imgHacked).toBeUndefined();

            const previewBtn = screen.getByRole("button", { name: /Paper Preview/i });
            fireEvent.click(previewBtn);

            expect(screen.getAllByText(xssPayload).length).toBeGreaterThanOrEqual(1);
            expect(document.getElementById("evil-script")).toBeNull();
            expect(testWindow.__hacked).toBeUndefined();
        });

        it("manages unsaved changes badge accurately as user edits text and saves", async () => {
            const onSaveCoverLetter = vi.fn().mockResolvedValue(undefined);

            const testLetter: CoverLetter = {
                id: "letter-unsaved-1",
                jobTitle: "Frontend Lead",
                companyName: "Netflix",
                tone: "professional",
                subjectLine: "Application for Frontend Lead",
                salutation: "Dear Netflix Team,",
                hookParagraph: "Original hook",
                bodyParagraphs: ["Original body"],
                closingParagraph: "Original closing",
                signOff: "Sincerely, Alex",
                fullText: "Initial full text content.",
                wordCount: 4,
                readingTimeMinutes: 1,
                createdAt: new Date().toISOString(),
            };

            render(
                React.createElement(CoverLetterTab, {
                    resumeId: "resume-123",
                    savedCoverLetters: [testLetter],
                    onSaveCoverLetter,
                })
            );

            expect(screen.queryByText(/Unsaved Changes/i)).not.toBeInTheDocument();

            const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i });
            fireEvent.change(textarea, { target: { value: "Initial full text content with new edits." } });

            expect(screen.getByText(/Unsaved Changes/i)).toBeInTheDocument();

            const saveBtn = screen.getByRole("button", { name: /Save Draft/i });
            fireEvent.click(saveBtn);

            await waitFor(() => {
                expect(onSaveCoverLetter).toHaveBeenCalledOnce();
                expect(screen.getByText(/Saved!/i)).toBeInTheDocument();
                expect(screen.queryByText(/Unsaved Changes/i)).not.toBeInTheDocument();
            });
        });

        it("handles deletion with confirmation modal and resets state", async () => {
            const onDeleteCoverLetterMock = vi.fn().mockResolvedValue(undefined);
            const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

            const testLetter: CoverLetter = {
                id: "letter-del-1",
                jobTitle: "Frontend Lead",
                companyName: "Netflix",
                tone: "professional",
                subjectLine: "Application for Frontend Lead",
                salutation: "Dear Netflix Team,",
                hookParagraph: "Hook",
                bodyParagraphs: ["Body"],
                closingParagraph: "Closing",
                signOff: "SignOff",
                fullText: "Text to be deleted.",
                wordCount: 4,
                readingTimeMinutes: 1,
                createdAt: new Date().toISOString(),
            };

            const TestContainer = () => {
                const [drafts, setDrafts] = React.useState<CoverLetter[]>([testLetter]);
                return React.createElement(CoverLetterTab, {
                    resumeId: "resume-123",
                    savedCoverLetters: drafts,
                    onDeleteCoverLetter: async (id: string): Promise<void> => {
                        onDeleteCoverLetterMock(id);
                        setDrafts((prev) => prev.filter((d) => d.id !== id));
                    },
                });
            };

            render(React.createElement(TestContainer));

            const deleteBtn = screen.getByRole("button", { name: /Delete Active Draft/i });
            fireEvent.click(deleteBtn);

            expect(confirmSpy).toHaveBeenCalledWith("Delete this saved cover letter draft?");
            expect(onDeleteCoverLetterMock).toHaveBeenCalledWith("letter-del-1");

            await waitFor(() => {
                expect(screen.getByText(/Generate Your Tailored Cover Letter/i)).toBeInTheDocument();
            });

            confirmSpy.mockRestore();
        });

        it("cancels deletion when user clicks cancel in confirm modal", () => {
            const onDeleteCoverLetter = vi.fn();
            const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

            const testLetter: CoverLetter = {
                id: "letter-del-cancel",
                jobTitle: "Frontend Lead",
                companyName: "Netflix",
                tone: "professional",
                subjectLine: "Application for Frontend Lead",
                salutation: "Dear Netflix Team,",
                hookParagraph: "Hook",
                bodyParagraphs: ["Body"],
                closingParagraph: "Closing",
                signOff: "SignOff",
                fullText: "Text to keep.",
                wordCount: 3,
                readingTimeMinutes: 1,
                createdAt: new Date().toISOString(),
            };

            render(
                React.createElement(CoverLetterTab, {
                    resumeId: "resume-123",
                    savedCoverLetters: [testLetter],
                    onDeleteCoverLetter,
                })
            );

            const deleteBtn = screen.getByRole("button", { name: /Delete Active Draft/i });
            fireEvent.click(deleteBtn);

            expect(confirmSpy).toHaveBeenCalledOnce();
            expect(onDeleteCoverLetter).not.toHaveBeenCalled();
            const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i }) as HTMLTextAreaElement;
            expect(textarea.value).toBe("Text to keep.");

            confirmSpy.mockRestore();
        });
    });
});
