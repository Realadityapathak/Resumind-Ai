import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CoverLetterTab } from "~/features/cover-letter/CoverLetterTab";
import { usePuterStore } from "~/services/puter/store";

vi.mock("~/services/puter/store", () => ({
    usePuterStore: vi.fn(),
}));

const makeMockLetter = (overrides: Partial<CoverLetter> = {}): CoverLetter => ({
    id: "cl-default-id",
    roleTitle: "Staff Software Engineer",
    jobTitle: "Staff Software Engineer",
    companyName: "Stripe",
    tone: "professional",
    subjectLine: "Application for Staff Software Engineer — Alex Rivera",
    salutation: "Dear Stripe Engineering Team,",
    hookParagraph: "I am excited to apply.",
    bodyParagraphs: ["Engineered payment systems handling billions."],
    closingParagraph: "Thank you for your time.",
    signOff: "Sincerely,\nAlex Rivera",
    fullText: "Subject: Application for Staff Software Engineer\n\nDear Stripe Engineering Team,\n\nI am excited to apply.\n\nSincerely,\nAlex Rivera",
    wordCount: 16,
    readingTimeMinutes: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});

describe("Adversarial Stress Testing: CoverLetterTab Print & Drafts", () => {
    beforeEach(() => {
        const chat = vi.fn();

        (usePuterStore as any).mockImplementation(() => ({
            ai: {
                chat,
            },
        }));
    });

    describe("1. Stress Test: 10 Drafts with Identical Company and Tone", () => {
        it("correctly renders disambiguation pills from #1 to #10 and permits switching to any of them", () => {
            const tenIdenticalDrafts: CoverLetter[] = Array.from({ length: 10 }, (_, i) =>
                makeMockLetter({
                    id: `cl-identical-${i + 1}`,
                    companyName: "Google",
                    tone: "executive",
                    fullText: `Letter content specifically for Google iteration ${i + 1}.`,
                })
            );

            const { container } = render(
                <CoverLetterTab
                    resumeId="res-stress-1"
                    parsedText="Alex Rivera Principal Engineer"
                    jobTitle="Staff Engineer"
                    companyName="Google"
                    savedCoverLetters={tenIdenticalDrafts}
                />
            );

            for (let i = 1; i <= 10; i++) {
                expect(screen.getByText(`Google #${i}`)).toBeInTheDocument();
            }

            const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i }) as HTMLTextAreaElement;
            expect(textarea.value).toBe("Letter content specifically for Google iteration 1.");

            const draft7Btn = screen.getByText("Google #7");
            fireEvent.click(draft7Btn);
            expect(textarea.value).toBe("Letter content specifically for Google iteration 7.");

            const draft10Btn = screen.getByText("Google #10");
            fireEvent.click(draft10Btn);
            expect(textarea.value).toBe("Letter content specifically for Google iteration 10.");

            const printable = container.querySelector("#printable-cover-letter");
            expect(printable?.textContent).toBe("Letter content specifically for Google iteration 10.");
        });
    });

    describe("2. Stress Test: Drafts with Empty, Missing, or Unusual Company and Tone", () => {
        it("handles empty company name by falling back to 'Draft' and disambiguates properly", () => {
            const emptyCompanyDrafts: CoverLetter[] = [
                makeMockLetter({
                    id: "empty-co-1",
                    companyName: "",
                    tone: "passionate",
                    fullText: "Letter without company name 1.",
                }),
                makeMockLetter({
                    id: "empty-co-2",
                    companyName: "",
                    tone: "passionate",
                    fullText: "Letter without company name 2.",
                }),
            ];

            render(
                <CoverLetterTab
                    resumeId="res-stress-empty"
                    parsedText="Alex Rivera"
                    jobTitle="Engineer"
                    companyName=""
                    savedCoverLetters={emptyCompanyDrafts}
                />
            );

            expect(screen.getByText("Draft #1")).toBeInTheDocument();
            expect(screen.getByText("Draft #2")).toBeInTheDocument();

            const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i }) as HTMLTextAreaElement;
            expect(textarea.value).toBe("Letter without company name 1.");

            fireEvent.click(screen.getByText("Draft #2"));
            expect(textarea.value).toBe("Letter without company name 2.");
        });

        it("handles single draft without company name by showing plain 'Draft'", () => {
            const singleEmptyDraft = [
                makeMockLetter({
                    id: "single-empty",
                    companyName: "",
                    tone: "conversational",
                    fullText: "Lone draft text.",
                }),
            ];

            render(
                <CoverLetterTab
                    resumeId="res-stress-single"
                    parsedText="Alex Rivera"
                    jobTitle="Engineer"
                    companyName=""
                    savedCoverLetters={singleEmptyDraft}
                />
            );

            expect(screen.getByText("Draft")).toBeInTheDocument();
            expect(screen.queryByText("Draft #1")).not.toBeInTheDocument();
        });

        it("handles mixed drafts: some unique, some duplicate", () => {
            const mixedDrafts: CoverLetter[] = [
                makeMockLetter({ id: "d1", companyName: "Amazon", tone: "professional", fullText: "Amazon Prof 1" }),
                makeMockLetter({ id: "d2", companyName: "Amazon", tone: "professional", fullText: "Amazon Prof 2" }),
                makeMockLetter({ id: "d3", companyName: "Amazon", tone: "executive", fullText: "Amazon Exec 1" }),
                makeMockLetter({ id: "d4", companyName: "Netflix", tone: "conversational", fullText: "Netflix Conv 1" }),
            ];

            render(
                <CoverLetterTab
                    resumeId="res-stress-mixed"
                    parsedText="Alex Rivera"
                    savedCoverLetters={mixedDrafts}
                />
            );

            expect(screen.getByText("Amazon #1")).toBeInTheDocument();
            expect(screen.getByText("Amazon #2")).toBeInTheDocument();
            expect(screen.getByText("Amazon")).toBeInTheDocument();
            expect(screen.getByText("Netflix")).toBeInTheDocument();
        });
    });

    describe("3. Stress Test: Rapid Draft Switching", () => {
        it("survives rapid consecutive switches without state corruption", () => {
            const drafts: CoverLetter[] = Array.from({ length: 5 }, (_, i) =>
                makeMockLetter({
                    id: `cl-switch-${i}`,
                    companyName: `Company_${i}`,
                    tone: "professional",
                    fullText: `Rapid switch text content for company ${i}.`,
                })
            );

            const { container } = render(
                <CoverLetterTab
                    resumeId="res-stress-rapid"
                    parsedText="Alex Rivera"
                    savedCoverLetters={drafts}
                />
            );

            const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i }) as HTMLTextAreaElement;

            for (let i = 0; i < 5; i++) {
                fireEvent.click(screen.getByText(`Company_${i}`));
            }
            expect(textarea.value).toBe("Rapid switch text content for company 4.");

            for (let i = 4; i >= 0; i--) {
                fireEvent.click(screen.getByText(`Company_${i}`));
            }
            expect(textarea.value).toBe("Rapid switch text content for company 0.");

            const printable = container.querySelector("#printable-cover-letter");
            expect(printable?.textContent).toBe("Rapid switch text content for company 0.");
        });
    });

    describe("4. Stress Test: Print Triggering with Unsaved Changes", () => {
        it("prints live edited text even when changes are unsaved", () => {
            const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

            const { container } = render(
                <CoverLetterTab
                    resumeId="res-stress-print-unsaved"
                    parsedText="Alex Rivera"
                    jobTitle="Staff Engineer"
                    companyName="Stripe"
                    savedCoverLetters={[makeMockLetter()]}
                />
            );

            const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i });
            fireEvent.change(textarea, {
                target: { value: "Live modified cover letter text that has NOT been saved to cloud yet." },
            });

            expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();

            const printable = container.querySelector("#printable-cover-letter");
            expect(printable?.textContent).toBe("Live modified cover letter text that has NOT been saved to cloud yet.");

            const printBtn = screen.getByRole("button", { name: /Print \/ PDF/i });
            fireEvent.click(printBtn);

            expect(printSpy).toHaveBeenCalledOnce();

            printSpy.mockRestore();
        });

        it("prints live edited text when viewing in Paper Preview mode", () => {
            const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

            const { container } = render(
                <CoverLetterTab
                    resumeId="res-stress-preview-print"
                    parsedText="Alex Rivera"
                    jobTitle="Staff Engineer"
                    companyName="Stripe"
                    savedCoverLetters={[makeMockLetter()]}
                />
            );

            const previewBtn = screen.getByRole("button", { name: /Paper Preview/i });
            fireEvent.click(previewBtn);

            const printBtn = screen.getByRole("button", { name: /Print \/ PDF/i });
            expect(printBtn).toBeInTheDocument();
            fireEvent.click(printBtn);

            expect(printSpy).toHaveBeenCalledOnce();

            const printable = container.querySelector("#printable-cover-letter");
            expect(printable).toBeInTheDocument();
            expect(printable).toHaveClass("hidden", "print:block");

            printSpy.mockRestore();
        });
    });

    describe("5. Stress Test: CSS Class Audit for Print Exclusions", () => {
        it("verifies all screen controls and chrome have no-print while printable target has print:block", () => {
            const { container } = render(
                <CoverLetterTab
                    resumeId="res-stress-classes"
                    parsedText="Alex Rivera"
                    jobTitle="Staff Engineer"
                    companyName="Stripe"
                    savedCoverLetters={[
                        makeMockLetter({ id: "d1", companyName: "Stripe", tone: "professional" }),
                        makeMockLetter({ id: "d2", companyName: "Stripe", tone: "professional" }),
                    ]}
                />
            );

            const printable = container.querySelector("#printable-cover-letter");
            expect(printable).not.toBeNull();
            expect(printable?.classList.contains("no-print")).toBe(false);
            expect(printable?.classList.contains("hidden")).toBe(true);
            expect(printable?.classList.contains("print:block")).toBe(true);

            const draftsContainer = screen.getByText("Saved Drafts:").closest(".no-print");
            expect(draftsContainer).not.toBeNull();

            const draftPills = screen.getAllByRole("button", { name: /Stripe/i });
            draftPills.forEach((pill) => {
                expect(pill).toHaveClass("no-print");
            });

            const headerBanner = screen.getByText("Tailored AI Cover Letter Generator").closest(".no-print");
            expect(headerBanner).not.toBeNull();

            const configForm = screen.getByText("1. Target Role & Tone Customizer").closest(".no-print");
            expect(configForm).not.toBeNull();

            const actionToolbar = screen.getByRole("button", { name: /Print \/ PDF/i }).closest(".no-print");
            expect(actionToolbar).not.toBeNull();
        });
    });
});
