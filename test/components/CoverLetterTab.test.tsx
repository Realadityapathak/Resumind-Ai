import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CoverLetterTab } from "~/features/cover-letter/CoverLetterTab";
import { usePuterStore } from "~/services/puter/store";

vi.mock("~/services/puter/store", () => ({
    usePuterStore: vi.fn(),
}));

const mockCoverLetter: CoverLetter = {
    id: "cl-test-1",
    roleTitle: "Staff Software Engineer",
    jobTitle: "Staff Software Engineer",
    companyName: "Stripe",
    tone: "professional",
    subjectLine: "Application for Staff Software Engineer — Alex Rivera",
    salutation: "Dear Stripe Engineering Team,",
    hookParagraph: "I am writing to express my strong interest in joining Stripe.",
    bodyParagraphs: [
        "In my previous role, I architected distributed real-time settlement services handling $20M+ daily.",
        "I also spearheaded reliability improvements reducing p99 latency by 35%.",
    ],
    closingParagraph: "Thank you for considering my application. I look forward to connecting.",
    signOff: "Sincerely,\nAlex Rivera",
    fullText: "Application for Staff Software Engineer — Alex Rivera\n\nDear Stripe Engineering Team,\n\nI am writing to express my strong interest in joining Stripe.\n\nIn my previous role, I architected distributed real-time settlement services handling $20M+ daily.\n\nI also spearheaded reliability improvements reducing p99 latency by 35%.\n\nThank you for considering my application. I look forward to connecting.\n\nSincerely,\nAlex Rivera",
    wordCount: 56,
    readingTimeMinutes: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

describe("CoverLetterTab Component (app/components/workspace/CoverLetterTab.tsx)", () => {
    let mockChat: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockChat = vi.fn().mockResolvedValue({
            message: {
                content: JSON.stringify({
                    subjectLine: "Application for Staff Software Engineer — Alex Rivera",
                    salutation: "Dear Stripe Team,",
                    hookParagraph: "I am thrilled to submit my application.",
                    bodyParagraphs: [
                        "Architected scalable microservices processing $50M daily.",
                        "Mentored 8 mid-level engineers.",
                    ],
                    closingParagraph: "I welcome the opportunity to discuss my qualifications.",
                    signOff: "Best regards,\nAlex Rivera",
                }),
            },
        });

        (usePuterStore as any).mockImplementation(() => ({
            ai: {
                chat: mockChat,
            },
        }));
    });

    it("renders the component with tone pills, inputs, and generate CTA", () => {
        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer with 8 years experience."
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
            />
        );

        expect(screen.getByText("Tailored AI Cover Letter Generator")).toBeInTheDocument();
        expect(screen.getByText("Professional")).toBeInTheDocument();
        expect(screen.getByText("Passionate")).toBeInTheDocument();
        expect(screen.getByText("Executive")).toBeInTheDocument();
        expect(screen.getByText("Conversational")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Generate Tailored Letter/i })).toBeInTheDocument();
    });

    it("allows selecting different tone pills", () => {
        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer"
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
            />
        );

        const passionateBtn = screen.getByRole("button", { name: /Passionate/i });
        fireEvent.click(passionateBtn);
        expect(passionateBtn).toHaveClass("bg-indigo-50/70");
    });

    it("displays preloaded cover letter and calculates word count and reading time", () => {
        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer"
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
                savedCoverLetters={[mockCoverLetter]}
            />
        );

        const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i }) as HTMLTextAreaElement;
        expect(textarea.value).toContain("Dear Stripe Engineering Team");
        expect(screen.getByText(/words/i)).toBeInTheDocument();
        expect(screen.getByText(/min read/i)).toBeInTheDocument();
    });

    it("updates word count dynamically as user edits text", () => {
        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer"
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
                savedCoverLetters={[mockCoverLetter]}
            />
        );

        const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i });
        fireEvent.change(textarea, { target: { value: "One two three four five six seven eight nine ten." } });

        expect(screen.getByText(/10/)).toBeInTheDocument();
        expect(screen.getByText(/words/i)).toBeInTheDocument();
    });

    it("toggles between edit mode and paper preview mode", () => {
        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer"
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
                savedCoverLetters={[mockCoverLetter]}
            />
        );

        const previewTab = screen.getByRole("button", { name: /Paper Preview/i });
        fireEvent.click(previewTab);

        expect(screen.getAllByText(/Dear Stripe Engineering Team,/i).length).toBeGreaterThanOrEqual(1);

        const editTab = screen.getByRole("button", { name: /Edit/i });
        fireEvent.click(editTab);
        expect(screen.getByRole("textbox", { name: /Cover Letter Document Editor/i })).toBeInTheDocument();
    });

    it("generates a new cover letter when clicking Generate and triggers onSaveCoverLetter", async () => {
        const onSaveCoverLetter = vi.fn().mockResolvedValue(undefined);

        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer with 8 years experience building distributed financial pipelines."
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
                onSaveCoverLetter={onSaveCoverLetter}
            />
        );

        const generateBtn = screen.getByRole("button", { name: /Generate Tailored Letter/i });
        fireEvent.click(generateBtn);

        await waitFor(() => {
            expect(mockChat).toHaveBeenCalledOnce();
            expect(onSaveCoverLetter).toHaveBeenCalledOnce();
        });

        const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i }) as HTMLTextAreaElement;
        expect(textarea.value).toContain("Dear Stripe Team,");
    });

    it("does not fabricate resume content when parsedText is missing", async () => {
        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText=""
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Generate Tailored Letter/i }));

        expect(
            await screen.findByText(/resume content is too short or missing/i)
        ).toBeInTheDocument();
        expect(mockChat).not.toHaveBeenCalled();
    });

    it("surfaces a save failure instead of implying the generated draft was persisted", async () => {
        const onSaveCoverLetter = vi.fn().mockRejectedValue(new Error("Puter KV rejected the write."));

        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer with 8 years experience building distributed financial pipelines."
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
                onSaveCoverLetter={onSaveCoverLetter}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Generate Tailored Letter/i }));

        await waitFor(() => {
            expect(onSaveCoverLetter).toHaveBeenCalledOnce();
        });
        expect(await screen.findByText(/generated.*could not be saved/i)).toBeInTheDocument();
    });

    it("copies full cover letter text to clipboard", async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer"
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
                savedCoverLetters={[mockCoverLetter]}
            />
        );

        const copyBtn = screen.getByRole("button", { name: /1-Click Copy/i });
        fireEvent.click(copyBtn);

        await waitFor(() => {
            expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("Dear Stripe Engineering Team"));
            expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
        });
    });

    it("triggers plain text (.txt) download", () => {
        const clickMock = vi.fn();
        HTMLAnchorElement.prototype.click = clickMock;
        const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
        const revokeObjectURLMock = vi.fn();
        global.URL.createObjectURL = createObjectURLMock;
        global.URL.revokeObjectURL = revokeObjectURLMock;

        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer"
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
                savedCoverLetters={[mockCoverLetter]}
            />
        );

        const downloadBtn = screen.getByRole("button", { name: /Download \.txt/i });
        fireEvent.click(downloadBtn);

        expect(createObjectURLMock).toHaveBeenCalled();
        expect(clickMock).toHaveBeenCalled();
    });

    it("triggers window.print when clicking Print / PDF Export", () => {
        const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

        const { container } = render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer"
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
                savedCoverLetters={[mockCoverLetter]}
            />
        );

        const printable = container.querySelector("#printable-cover-letter");
        expect(printable).toBeInTheDocument();
        expect(printable).toHaveClass("hidden");
        expect(printable).toHaveClass("print:block");
        expect(printable).toHaveClass("font-serif");
        expect(printable).toHaveClass("text-black");
        expect(printable).toHaveClass("leading-relaxed");
        expect(printable).toHaveClass("whitespace-pre-wrap");
        expect(printable?.textContent).toContain("Dear Stripe Engineering Team");

        const printBtn = screen.getByRole("button", { name: /Print \/ PDF/i });
        expect(printBtn).toHaveClass("no-print");
        expect(printBtn.closest(".no-print")).toBeInTheDocument();

        fireEvent.click(printBtn);

        expect(printSpy).toHaveBeenCalledOnce();
        printSpy.mockRestore();
    });

    it("ensures #printable-cover-letter has print classes and interactive chrome buttons/toolbars have no-print", () => {
        const { container } = render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer"
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
                savedCoverLetters={[mockCoverLetter]}
            />
        );

        const printable = container.querySelector("#printable-cover-letter");
        expect(printable).toBeInTheDocument();
        expect(printable).toHaveClass("hidden", "print:block", "font-serif", "text-black", "leading-relaxed", "whitespace-pre-wrap");

        const noPrintElements = container.querySelectorAll(".no-print");
        expect(noPrintElements.length).toBeGreaterThanOrEqual(5);

        const saveBtn = screen.getByRole("button", { name: /Save Draft/i });
        const copyBtn = screen.getByRole("button", { name: /1-Click Copy/i });
        const downloadBtn = screen.getByRole("button", { name: /Download \.txt/i });
        const printBtn = screen.getByRole("button", { name: /Print \/ PDF/i });

        expect(saveBtn).toHaveClass("no-print");
        expect(copyBtn).toHaveClass("no-print");
        expect(downloadBtn).toHaveClass("no-print");
        expect(printBtn).toHaveClass("no-print");
    });

    it("disambiguates saved draft pills when multiple drafts share identical company and tone", () => {
        const draft1: CoverLetter = {
            ...mockCoverLetter,
            id: "cl-test-1",
            companyName: "Stripe",
            tone: "professional",
            fullText: "First Stripe professional cover letter text.",
        };
        const draft2: CoverLetter = {
            ...mockCoverLetter,
            id: "cl-test-2",
            companyName: "Stripe",
            tone: "professional",
            fullText: "Second Stripe professional cover letter text.",
        };

        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer"
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
                savedCoverLetters={[draft1, draft2]}
            />
        );

        expect(screen.getByText("Stripe #1")).toBeInTheDocument();
        expect(screen.getByText("Stripe #2")).toBeInTheDocument();

        const draft2Pill = screen.getByText("Stripe #2");
        fireEvent.click(draft2Pill);

        const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i }) as HTMLTextAreaElement;
        expect(textarea.value).toBe("Second Stripe professional cover letter text.");
    });

    it("switches active cover letter draft when clicking another saved draft pill", () => {
        const draft2: CoverLetter = {
            ...mockCoverLetter,
            id: "cl-test-2",
            roleTitle: "Engineering Manager",
            companyName: "Airbnb",
            tone: "executive",
            fullText: "Cover letter for Airbnb Engineering Manager position.",
        };

        render(
            <CoverLetterTab
                resumeId="resume-123"
                parsedText="Alex Rivera Staff Engineer"
                jobTitle="Staff Software Engineer"
                companyName="Stripe"
                savedCoverLetters={[mockCoverLetter, draft2]}
            />
        );

        expect(screen.getByText("Stripe")).toBeInTheDocument();
        const draft2Pill = screen.getByText("Airbnb");
        fireEvent.click(draft2Pill);

        const textarea = screen.getByRole("textbox", { name: /Cover Letter Document Editor/i }) as HTMLTextAreaElement;
        expect(textarea.value).toBe("Cover letter for Airbnb Engineering Manager position.");
    });
});
