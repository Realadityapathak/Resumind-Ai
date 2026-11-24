import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateMarkdownReport, exportEvaluationReport } from "~/utils/exportReport";

const MOCK_RESUME: Resume = {
    id: "resume-export-1",
    companyName: "Acme Corp",
    jobTitle: "Senior Frontend Engineer",
    fileName: "senior_frontend.pdf",
    imagePath: "/mock/img.png",
    resumePath: "/mock/resume.pdf",
    pageCount: 2,
    createdAt: "2026-11-20T12:00:00.000Z",
    feedback: {
        overallScore: 82,
        content: {
            score: 85,
            tips: [
                { type: "good", tip: "Great quantifiable impact in bullet points.", explanation: "Shows business value." },
                { type: "improve", tip: "Add more details on scale of users served.", explanation: "Helps recruiters gauge scope." },
            ],
        },
        structure: {
            score: 80,
            tips: [
                { type: "good", tip: "Clear reverse-chronological layout.", explanation: "Easy to parse." },
            ],
        },
        skills: {
            score: 78,
            tips: [
                { type: "improve", tip: "Missing React 19 and Next.js modern paradigms.", explanation: "Requested in JD." },
            ],
        },
        toneAndStyle: {
            score: 88,
            tips: [
                { type: "good", tip: "Strong active voice with punchy verbs.", explanation: "Executive tone." },
            ],
        },
        ATS: {
            score: 84,
            tips: [
                { type: "good", tip: "Standard section headers recognized by major ATS engines." },
                { type: "improve", tip: "Avoid multi-column tables in experience section." },
            ],
        },
    },
    keywordAnalysis: {
        matchRate: 75,
        totalJobKeywords: 20,
        matchedCount: 15,
        missingCount: 5,
        matchedKeywords: [
            {
                keyword: "TypeScript",
                category: "technical",
                importance: "critical",
                frequencyInJob: 5,
                frequencyInResume: 8,
            },
            {
                keyword: "System Design",
                category: "domain",
                importance: "recommended",
                frequencyInJob: 3,
                frequencyInResume: 2,
            },
        ],
        missingKeywords: [
            {
                keyword: "GraphQL",
                category: "technical",
                importance: "critical",
                frequencyInJob: 4,
                frequencyInResume: 0,
                contextOrSuggestion: "Highlight GraphQL API consumption in projects.",
            },
        ],
        topRecommendations: [
            "Incorporate GraphQL in backend or integration bullet points.",
        ],
    },
};

describe("ATS Diagnostic Summary Export (app/utils/exportReport.ts)", () => {
    describe("generateMarkdownReport()", () => {
        it("generates complete markdown report containing all required evaluation sections", () => {
            const md = generateMarkdownReport(MOCK_RESUME);

            // Header info
            expect(md).toContain("# ATS Diagnostic & Evaluation Summary Report");
            expect(md).toContain("**Company Target:** Acme Corp");
            expect(md).toContain("**Target Role:** Senior Frontend Engineer");
            expect(md).toContain("**Source Document:** senior_frontend.pdf");
            expect(md).toContain("**Page Count:** 2");

            // Overall score & tier
            expect(md).toContain("**Score:** 82 / 100");
            expect(md).toContain("Strong");

            // Category score breakdown
            expect(md).toContain("**Content & Impact:** 85/100");
            expect(md).toContain("**Structure & Layout:** 80/100");
            expect(md).toContain("**Core Skills & Tech:** 78/100");
            expect(md).toContain("**Tone & Style:** 88/100");
            expect(md).toContain("**ATS Parsability:** 84/100");

            // Strengths
            expect(md).toContain("Great quantifiable impact in bullet points.");
            expect(md).toContain("Clear reverse-chronological layout.");
            expect(md).toContain("Strong active voice with punchy verbs.");
            expect(md).toContain("Standard section headers recognized by major ATS engines.");

            // Improvement tips
            expect(md).toContain("Add more details on scale of users served.");
            expect(md).toContain("Missing React 19 and Next.js modern paradigms.");
            expect(md).toContain("Avoid multi-column tables in experience section.");

            // Keyword analysis
            expect(md).toContain("## Keyword Gap Analysis");
            expect(md).toContain("**Match Rate:** 75%");
            expect(md).toContain("**TypeScript** (Category: technical, Importance: critical");
            expect(md).toContain("**GraphQL** (Category: technical, Importance: critical");
            expect(md).toContain("Suggestion: Highlight GraphQL API consumption in projects.");
        });

        it("gracefully handles minimal or missing optional fields without throwing", () => {
            const minimalResume: Resume = {
                id: "res-min",
                imagePath: "",
                resumePath: "",
                feedback: {
                    overallScore: 42,
                    ATS: { score: 40, tips: [] },
                    content: { score: 45, tips: [] },
                    structure: { score: 40, tips: [] },
                    skills: { score: 40, tips: [] },
                    toneAndStyle: { score: 45, tips: [] },
                },
            };

            const md = generateMarkdownReport(minimalResume);

            expect(md).toContain("**Company Target:** General application");
            expect(md).toContain("**Target Role:** Resume Workspace");
            expect(md).toContain("**Score:** 42 / 100");
            expect(md).toContain("Needs Work");
            expect(md).toContain("No specific strengths recorded.");
            expect(md).toContain("No improvement recommendations generated.");
            expect(md).not.toContain("## Keyword Gap Analysis");
        });

        it("safely handles corrupted createdAt date string without throwing RangeError", () => {
            const corruptedDateResume: Resume = {
                ...MOCK_RESUME,
                createdAt: "corrupted-unparseable-date",
            };

            expect(() => generateMarkdownReport(corruptedDateResume)).not.toThrow();
            const md = generateMarkdownReport(corruptedDateResume);
            expect(md).toContain("- **Evaluation Date:**");
        });

        it("handles legacy string array format in keyword analysis cleanly", () => {
            const legacyResume: Resume = {
                ...MOCK_RESUME,
                keywordAnalysis: {
                    matchRate: 60,
                    totalJobKeywords: 10,
                    matchedCount: 6,
                    missingCount: 4,
                    matchedKeywords: ["React", "CSS"] as any,
                    missingKeywords: ["GraphQL", "Docker"] as any,
                },
            };

            const md = generateMarkdownReport(legacyResume);
            expect(md).toContain("- **React**");
            expect(md).toContain("- **CSS**");
            expect(md).toContain("- **GraphQL**");
            expect(md).toContain("- **Docker**");
            expect(md).not.toContain("undefined");
        });
    });

    describe("exportEvaluationReport()", () => {
        let mockCreateObjectURL: any;
        let mockRevokeObjectURL: any;

        beforeEach(() => {
            vi.useFakeTimers();
            mockCreateObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:http://localhost/mock-blob-uuid");
            mockRevokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
        });

        afterEach(() => {
            vi.useRealTimers();
            mockCreateObjectURL.mockRestore();
            mockRevokeObjectURL.mockRestore();
        });

        it("creates Blob, triggers download anchor, and safely cleans up Object URL", () => {
            const clickSpy = vi.fn();
            const originalCreateElement = document.createElement.bind(document);
            vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
                const element = originalCreateElement(tagName);
                if (tagName === "a") {
                    element.click = clickSpy;
                }
                return element;
            });

            exportEvaluationReport(MOCK_RESUME);

            expect(mockCreateObjectURL).toHaveBeenCalledOnce();
            expect(clickSpy).toHaveBeenCalledOnce();

            // Revocation happens after timeout
            expect(mockRevokeObjectURL).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1000);
            expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/mock-blob-uuid");
        });
    });
});
