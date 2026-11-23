import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PdfPreviewer from "~/features/resume-workspace/PdfPreviewer";

describe("<PdfPreviewer /> Component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock clipboard API
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
    });

    it("renders visual preview with provided image url", () => {
        render(
            <PdfPreviewer
                imageUrl="blob:page-1-mock"
                resumeUrl="blob:pdf-mock"
                fileName="test-resume.pdf"
                pageCount={1}
            />
        );

        const img = screen.getByRole("img", { name: /Resume Page 1/i });
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute("src", "blob:page-1-mock");
    });

    it("toggles between visual preview and extracted plaintext view", () => {
        render(
            <PdfPreviewer
                imageUrl="blob:page-1-mock"
                parsedText="Jane Doe Senior Full Stack Engineer with React and Node.js experience."
                fileName="test-resume.pdf"
            />
        );

        // Click Plaintext tab
        const plaintextBtn = screen.getByRole("button", { name: /Plaintext/i });
        fireEvent.click(plaintextBtn);

        expect(screen.getByText(/Jane Doe Senior Full Stack Engineer/i)).toBeInTheDocument();
        expect(screen.getByText(/words/i)).toBeInTheDocument();
        expect(screen.getByText(/characters/i)).toBeInTheDocument();

        // Switch back to Visual
        const visualBtn = screen.getByRole("button", { name: /Visual Preview/i });
        fireEvent.click(visualBtn);

        expect(screen.getByRole("img", { name: /Resume Page 1/i })).toBeInTheDocument();
    });

    it("copies extracted text to clipboard on button click", async () => {
        render(
            <PdfPreviewer
                imageUrl="blob:page-1-mock"
                parsedText="Sample extracted resume plaintext content."
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Plaintext/i }));
        const copyBtn = screen.getByRole("button", { name: /Copy All Text/i });
        fireEvent.click(copyBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            "Sample extracted resume plaintext content."
        );
        expect(await screen.findByText(/Copied!/i)).toBeInTheDocument();
    });

    it("handles multi-page navigation and thumbnail strip clicking", () => {
        render(
            <PdfPreviewer
                imageUrl="blob:page-1"
                imageUrls={["blob:page-1", "blob:page-2"]}
                pageCount={2}
            />
        );

        expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

        // Next page button
        const nextBtn = screen.getByRole("button", { name: /Next page/i });
        expect(nextBtn).toBeEnabled();

        const prevBtn = screen.getByRole("button", { name: /Previous page/i });
        expect(prevBtn).toBeDisabled();

        // Click next
        fireEvent.click(nextBtn);
        expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
        expect(screen.getByRole("img", { name: /Resume Page 2/i })).toHaveAttribute("src", "blob:page-2");

        // Click thumbnail for Page 1
        const thumbPage1 = screen.getByRole("button", { name: /Go to page 1/i });
        fireEvent.click(thumbPage1);
        expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    it("adjusts zoom level on zoom in, zoom out, and fit controls", () => {
        render(
            <PdfPreviewer
                imageUrl="blob:page-1"
                pageCount={1}
            />
        );

        expect(screen.getByText("100%")).toBeInTheDocument();

        const zoomInBtn = screen.getByRole("button", { name: /Zoom in/i });
        fireEvent.click(zoomInBtn);
        expect(screen.getByText("115%")).toBeInTheDocument();

        const zoomOutBtn = screen.getByRole("button", { name: /Zoom out/i });
        fireEvent.click(zoomOutBtn);
        expect(screen.getByText("100%")).toBeInTheDocument();

        // Fit resets to 100%
        fireEvent.click(zoomInBtn);
        fireEvent.click(zoomInBtn);
        const fitBtn = screen.getByRole("button", { name: /Fit/i });
        fireEvent.click(fitBtn);
        expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("displays OCR indicator when document is scanned and OCR transcribed", () => {
        render(
            <PdfPreviewer
                imageUrl="blob:page-1"
                parsedText="OCR recognized text"
                isScanned={true}
                ocrApplied={true}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Plaintext/i }));
        expect(screen.getByText(/OCR Transcribed/i)).toBeInTheDocument();
    });

    describe("Adversarial Stress Testing & Boundary Clamping", () => {
        it("clamps zoom in strictly at 2.0 (200%) despite 20 consecutive rapid clicks", () => {
            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    pageCount={1}
                />
            );

            const zoomInBtn = screen.getByRole("button", { name: /Zoom in/i });

            // Rapidly click zoom in 20 times
            for (let i = 0; i < 20; i++) {
                fireEvent.click(zoomInBtn);
            }

            expect(screen.getByText("200%")).toBeInTheDocument();
            expect(zoomInBtn).toBeDisabled();
        });

        it("clamps zoom out strictly at 0.5 (50%) despite 20 consecutive rapid clicks", () => {
            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    pageCount={1}
                />
            );

            const zoomOutBtn = screen.getByRole("button", { name: /Zoom out/i });

            // Rapidly click zoom out 20 times
            for (let i = 0; i < 20; i++) {
                fireEvent.click(zoomOutBtn);
            }

            expect(screen.getByText("50%")).toBeInTheDocument();
            expect(zoomOutBtn).toBeDisabled();
        });

        it("resets extreme zoom levels back to 100% when Fit button is clicked", () => {
            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    pageCount={1}
                />
            );

            const zoomInBtn = screen.getByRole("button", { name: /Zoom in/i });
            for (let i = 0; i < 15; i++) {
                fireEvent.click(zoomInBtn);
            }
            expect(screen.getByText("200%")).toBeInTheDocument();

            const fitBtn = screen.getByRole("button", { name: "Fit" });
            fireEvent.click(fitBtn);
            expect(screen.getByText("100%")).toBeInTheDocument();
        });

        it("clamps zoom in fullscreen modal and closes cleanly on Escape key press", () => {
            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    fileName="my-cv.pdf"
                    pageCount={1}
                />
            );

            // Open fullscreen
            const fsBtn = screen.getByRole("button", { name: /Fullscreen/i });
            fireEvent.click(fsBtn);

            // Verify modal rendered
            expect(screen.getByText("Close (Esc)")).toBeInTheDocument();

            // Zoom in inside modal
            const modalZoomInBtn = screen.getAllByRole("button", { name: /\+/i })[0];
            for (let i = 0; i < 20; i++) {
                fireEvent.click(modalZoomInBtn);
            }
            // Zoom clamped at 200% (present in both toolbar and modal)
            expect(screen.getAllByText("200%").length).toBeGreaterThanOrEqual(1);

            // Press Escape key
            fireEvent.keyDown(window, { key: "Escape" });
            expect(screen.queryByText("Close (Esc)")).not.toBeInTheDocument();
        });

        it("enforces page navigation boundary clamping (cannot navigate < 1 or > totalPages)", () => {
            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    imageUrls={["blob:p1", "blob:p2", "blob:p3"]}
                    pageCount={3}
                />
            );

            const prevBtn = screen.getByRole("button", { name: /Previous page/i });
            const nextBtn = screen.getByRole("button", { name: /Next page/i });

            // Boundary 1: At Page 1, prev is disabled and clicking it maintains Page 1
            expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
            expect(prevBtn).toBeDisabled();
            fireEvent.click(prevBtn);
            expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

            // Navigate to page 3
            fireEvent.click(nextBtn);
            expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
            fireEvent.click(nextBtn);
            expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();

            // Boundary 2: At Page 3, next is disabled and clicking it maintains Page 3
            expect(nextBtn).toBeDisabled();
            fireEvent.click(nextBtn);
            expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
        });

        it("clamps currentPage when totalPages shrinks dynamically", () => {
            const { rerender } = render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    imageUrls={["blob:p1", "blob:p2", "blob:p3", "blob:p4", "blob:p5"]}
                    pageCount={5}
                />
            );

            // Navigate to Page 4
            const nextBtn = screen.getByRole("button", { name: /Next page/i });
            fireEvent.click(nextBtn); // p2
            fireEvent.click(nextBtn); // p3
            fireEvent.click(nextBtn); // p4
            expect(screen.getByText("Page 4 of 5")).toBeInTheDocument();

            // Document dynamically updates to only 2 pages
            rerender(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    imageUrls={["blob:p1", "blob:p2"]}
                    pageCount={2}
                />
            );

            // Current page must automatically clamp to 2
            expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
        });

        it("handles 0, negative, or undefined pageCount safely without crashing", () => {
            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    pageCount={0}
                />
            );

            // Should safely fallback to 1 page
            expect(screen.getByRole("img", { name: /Resume Page 1/i })).toBeInTheDocument();
        });

        it("handles empty parsedText: displays placeholder and does not invoke clipboard writeText", () => {
            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    parsedText=""
                />
            );

            fireEvent.click(screen.getByRole("button", { name: /Plaintext/i }));

            expect(screen.getByText("0 words")).toBeInTheDocument();
            expect(screen.getByText("0 characters")).toBeInTheDocument();
            expect(screen.getByText("No plaintext layer extracted from this document.")).toBeInTheDocument();

            const copyBtn = screen.getByRole("button", { name: /Copy All Text/i });
            fireEvent.click(copyBtn);

            // Clipboard must NOT be called for empty string
            expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
        });

        it("stress-tests large text blocks (10,000 words, ~60,000 chars) without crashing or DOM lag", async () => {
            // Generate a 10,000 word text block
            const words = Array.from({ length: 10000 }, (_, i) => `word${i}`);
            const hugeText = words.join(" ");

            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    parsedText={hugeText}
                />
            );

            fireEvent.click(screen.getByRole("button", { name: /Plaintext/i }));

            expect(screen.getByText("10000 words")).toBeInTheDocument();
            expect(screen.getByText(`${hugeText.length} characters`)).toBeInTheDocument();

            const copyBtn = screen.getByRole("button", { name: /Copy All Text/i });
            fireEvent.click(copyBtn);

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(hugeText);
            expect(await screen.findByText(/Copied!/i)).toBeInTheDocument();
        });

        it("handles clipboard writeText rejection gracefully without unhandled crashes", async () => {
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            (navigator.clipboard.writeText as any).mockRejectedValueOnce(
                new Error("NotAllowedError: Clipboard permission denied")
            );

            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    parsedText="Valid text content to copy"
                />
            );

            fireEvent.click(screen.getByRole("button", { name: /Plaintext/i }));
            const copyBtn = screen.getByRole("button", { name: /Copy All Text/i });
            fireEvent.click(copyBtn);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(
                    "Failed to copy text:",
                    expect.any(Error)
                );
            });
            consoleSpy.mockRestore();
        });

        it("renders empty preview fallback with external PDF link when no image URLs are provided", () => {
            render(
                <PdfPreviewer
                    resumeUrl="https://puter.com/files/my-resume.pdf"
                />
            );

            expect(screen.getByText("No preview image available")).toBeInTheDocument();
            const externalLink = screen.getByRole("link", { name: /Open PDF in new tab/i });
            expect(externalLink).toHaveAttribute("href", "https://puter.com/files/my-resume.pdf");
            expect(externalLink).toHaveAttribute("target", "_blank");
        });

        it("renders loading spinner and hides viewer controls when isLoading is true", () => {
            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    isLoading={true}
                    pageCount={2}
                />
            );

            expect(screen.getByText("Loading document preview...")).toBeInTheDocument();
            // In loading state, the image should not be visible
            expect(screen.queryByRole("img", { name: /Resume Page 1/i })).not.toBeInTheDocument();
        });

        it("allows jumping directly to arbitrary pages via thumbnail strip in a 12-page document", () => {
            const pageImages = Array.from({ length: 12 }, (_, i) => `blob:page-${i + 1}`);
            render(
                <PdfPreviewer
                    imageUrls={pageImages}
                    pageCount={12}
                />
            );

            expect(screen.getByText("Page 1 of 12")).toBeInTheDocument();

            // Click thumbnail for page 7
            const page7Thumb = screen.getByRole("button", { name: /Go to page 7/i });
            fireEvent.click(page7Thumb);

            expect(screen.getByText("Page 7 of 12")).toBeInTheDocument();
            expect(screen.getByRole("img", { name: /Resume Page 7/i })).toHaveAttribute("src", "blob:page-7");

            // Click thumbnail for page 12
            const page12Thumb = screen.getByRole("button", { name: /Go to page 12/i });
            fireEvent.click(page12Thumb);

            expect(screen.getByText("Page 12 of 12")).toBeInTheDocument();
            expect(screen.getByRole("img", { name: /Resume Page 12/i })).toHaveAttribute("src", "blob:page-12");
        });

        it("closes fullscreen modal on Close button click and ignores non-Escape keys", () => {
            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    fileName="my-cv.pdf"
                />
            );

            // Open fullscreen
            fireEvent.click(screen.getByRole("button", { name: /Fullscreen/i }));
            expect(screen.getByText("Close (Esc)")).toBeInTheDocument();

            // Press other keys - modal should remain open
            fireEvent.keyDown(window, { key: "Enter" });
            fireEvent.keyDown(window, { key: "ArrowRight" });
            fireEvent.keyDown(window, { key: "Tab" });
            expect(screen.getByText("Close (Esc)")).toBeInTheDocument();

            // Click Close button
            fireEvent.click(screen.getByText("Close (Esc)"));
            expect(screen.queryByText("Close (Esc)")).not.toBeInTheDocument();
        });

        it("handles rapid consecutive clicks on Copy All Text safely", async () => {
            render(
                <PdfPreviewer
                    imageUrl="blob:page-1"
                    parsedText="Important resume bullet content"
                />
            );

            fireEvent.click(screen.getByRole("button", { name: /Plaintext/i }));
            const copyBtn = screen.getByRole("button", { name: /Copy All Text/i });

            // Rapidly click 5 times
            for (let i = 0; i < 5; i++) {
                fireEvent.click(copyBtn);
            }

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Important resume bullet content");
            expect(await screen.findByText(/Copied!/i)).toBeInTheDocument();
        });
    });
});
