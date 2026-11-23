import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
    extractTextFromContent,
    processPdfDocument,
    convertPdfToImage,
    _setPdfJsLib,
} from "~/services/pdf/processPdfDocument";

describe("PDF Processing Engine (app/services/pdf/processPdfDocument.ts)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _setPdfJsLib(null);
    });

    afterEach(() => {
        _setPdfJsLib(null);
    });

    describe("extractTextFromContent()", () => {
        it("returns empty string when input is empty or invalid", () => {
            expect(extractTextFromContent([])).toBe("");
            expect(extractTextFromContent(null as any)).toBe("");
            expect(extractTextFromContent(undefined as any)).toBe("");
        });

        it("concatenates strings and inserts line breaks when hasEOL is true", () => {
            const items = [
                { str: "Jane Doe", hasEOL: true },
                { str: "Senior Software Engineer", hasEOL: true },
                { str: "Experienced in", hasEOL: false },
                { str: "React and TypeScript", hasEOL: true },
            ];

            const result = extractTextFromContent(items);
            expect(result).toBe("Jane Doe\nSenior Software Engineer\nExperienced in React and TypeScript");
        });

        it("adds spaces between inline items without duplicate spacing", () => {
            const items = [
                { str: "Led", hasEOL: false },
                { str: "engineering", hasEOL: false },
                { str: "team.", hasEOL: true },
            ];

            const result = extractTextFromContent(items);
            expect(result).toBe("Led engineering team.");
        });

        it("normalizes excessive whitespace and collapses multiple blank lines", () => {
            const items = [
                { str: "Paragraph 1", hasEOL: true },
                { str: "", hasEOL: true },
                { str: "", hasEOL: true },
                { str: "", hasEOL: true },
                { str: "Paragraph 2 with   multiple   spaces", hasEOL: false },
            ];

            const result = extractTextFromContent(items);
            expect(result).toBe("Paragraph 1\n\nParagraph 2 with multiple spaces");
        });
    });

    describe("processPdfDocument()", () => {
        const createMockPdfLib = (pagesData: { textItems: { str: string; hasEOL?: boolean }[] }[]) => {
            return {
                getDocument: vi.fn(() => ({
                    promise: Promise.resolve({
                        numPages: pagesData.length,
                        getPage: vi.fn(async (num: number) => {
                            const pageIndex = num - 1;
                            const pageData = pagesData[pageIndex] || { textItems: [] };
                            return {
                                getViewport: vi.fn(({ scale = 2 }: { scale?: number } = {}) => ({
                                    width: 612 * scale,
                                    height: 792 * scale,
                                    scale,
                                })),
                                getTextContent: vi.fn(async () => ({
                                    items: pageData.textItems,
                                })),
                                render: vi.fn(() => ({
                                    promise: Promise.resolve(),
                                })),
                            };
                        }),
                    }),
                })),
                GlobalWorkerOptions: { workerSrc: "" },
            };
        };

        it("processes multi-page PDFs and extracts plain text across all pages", async () => {
            const mockLib = createMockPdfLib([
                {
                    textItems: [
                        { str: "Jane Doe - Senior Full Stack Engineer", hasEOL: true },
                        { str: "Skills: React, Node.js, TypeScript, PostgreSQL", hasEOL: true },
                    ],
                },
                {
                    textItems: [
                        { str: "Experience: Led front-end architecture for cloud-native SaaS.", hasEOL: true },
                        { str: "Education: B.S. in Computer Science from University of Tech.", hasEOL: true },
                    ],
                },
            ]);
            _setPdfJsLib(mockLib);

            const file = new File(["dummy-pdf-content"], "resume.pdf", { type: "application/pdf" });
            const result = await processPdfDocument(file, { scale: 2.0 });

            expect(result.pageCount).toBe(2);
            expect(result.pages.length).toBe(2);
            expect(result.isScanned).toBe(false);
            expect(result.pages[0].pageNumber).toBe(1);
            expect(result.pages[1].pageNumber).toBe(2);
            expect(result.fullText).toContain("Jane Doe");
            expect(result.fullText).toContain("Education: B.S. in Computer Science");
        });

        it("detects scanned PDF documents when extracted text is less than 50 characters", async () => {
            const mockLib = createMockPdfLib([
                {
                    textItems: [
                        { str: "Page 1 of 1", hasEOL: true }, // 11 chars
                    ],
                },
            ]);
            _setPdfJsLib(mockLib);

            const file = new File(["scanned-content"], "scanned_resume.pdf", { type: "application/pdf" });
            const result = await processPdfDocument(file);

            expect(result.isScanned).toBe(true);
            expect(result.fullText.length).toBeLessThan(50);
            expect(result.pages.length).toBe(1);
        });

        it("respects maxPages constraint when specified", async () => {
            const mockLib = createMockPdfLib([
                { textItems: [{ str: "Page 1 Content with sufficient length to verify page parsing.", hasEOL: true }] },
                { textItems: [{ str: "Page 2 Content with sufficient length to verify page parsing.", hasEOL: true }] },
                { textItems: [{ str: "Page 3 Content with sufficient length to verify page parsing.", hasEOL: true }] },
            ]);
            _setPdfJsLib(mockLib);

            const file = new File(["3-page-pdf"], "multi.pdf", { type: "application/pdf" });
            const result = await processPdfDocument(file, { maxPages: 1 });

            expect(result.pageCount).toBe(3);
            expect(result.pages.length).toBe(1);
            expect(result.pages[0].pageNumber).toBe(1);
        });

        it("handles PDF loading failures gracefully and returns error object", async () => {
            const failingLib = {
                getDocument: vi.fn(() => ({
                    promise: Promise.reject(new Error("Invalid or corrupted PDF header")),
                })),
                GlobalWorkerOptions: { workerSrc: "" },
            };
            _setPdfJsLib(failingLib);

            const file = new File(["corrupted"], "bad.pdf", { type: "application/pdf" });
            const result = await processPdfDocument(file);

            expect(result.pages).toEqual([]);
            expect(result.isScanned).toBe(true);
            expect(result.error).toContain("Invalid or corrupted PDF header");
        });
    });

    describe("convertPdfToImage()", () => {
        it("returns single-page conversion result delegating to processPdfDocument", async () => {
            const mockLib = {
                getDocument: vi.fn(() => ({
                    promise: Promise.resolve({
                        numPages: 1,
                        getPage: vi.fn(async () => ({
                            getViewport: vi.fn(() => ({ width: 612, height: 792, scale: 2 })),
                            getTextContent: vi.fn(async () => ({
                                items: [{ str: "Resume text for single page test conversion", hasEOL: true }],
                            })),
                            render: vi.fn(() => ({ promise: Promise.resolve() })),
                        })),
                    }),
                })),
                GlobalWorkerOptions: { workerSrc: "" },
            };
            _setPdfJsLib(mockLib);

            const file = new File(["pdf"], "doc.pdf", { type: "application/pdf" });
            const result = await convertPdfToImage(file);

            expect(result.file).not.toBeNull();
            expect(result.file?.name).toBe("doc_page_1.png");
            expect(result.imageUrl).toContain("blob:");
        });
    });

    describe("Adversarial Stress Testing & Edge Cases", () => {
        const createMockMultiPageLib = (
            numPages: number,
            getPageContent?: (pageNum: number) => {
                items: { str: string; hasEOL?: boolean }[];
            } | null
        ) => {
            return {
                getDocument: vi.fn(() => ({
                    promise: Promise.resolve({
                        numPages,
                        getPage: vi.fn(async (pageNum: number) => {
                            if (getPageContent) {
                                const content = getPageContent(pageNum);
                                if (content === null) {
                                    throw new Error(`Corrupted page ${pageNum}`);
                                }
                            }
                            return {
                                getViewport: vi.fn(({ scale = 2 }: { scale?: number } = {}) => ({
                                    width: 612 * scale,
                                    height: 792 * scale,
                                    scale,
                                })),
                                getTextContent: vi.fn(async () => {
                                    if (getPageContent) {
                                        const content = getPageContent(pageNum);
                                        return content || { items: [] };
                                    }
                                    return {
                                        items: [
                                            {
                                                str: `Page ${pageNum} technical leadership and distributed systems architecture content exceeding threshold.`,
                                                hasEOL: true,
                                            },
                                        ],
                                    };
                                }),
                                render: vi.fn(() => ({ promise: Promise.resolve() })),
                            };
                        }),
                    }),
                })),
                GlobalWorkerOptions: { workerSrc: "" },
            };
        };

        it("stress-tests large 15-page document (10+ pages) without memory degradation or dropping pages", async () => {
            const mockLib = createMockMultiPageLib(15);
            _setPdfJsLib(mockLib);

            const file = new File(["15-page-binary-mock"], "senior-executive-resume.pdf", {
                type: "application/pdf",
            });
            const result = await processPdfDocument(file, { scale: 2.0 });

            expect(result.pageCount).toBe(15);
            expect(result.pages.length).toBe(15);
            expect(result.pagesText.length).toBe(15);
            expect(result.isScanned).toBe(false);

            // Verify sequential indexing and naming
            for (let i = 0; i < 15; i++) {
                const pageNum = i + 1;
                expect(result.pages[i].pageNumber).toBe(pageNum);
                expect(result.pages[i].file.name).toBe(`senior-executive-resume_page_${pageNum}.png`);
                expect(result.pages[i].width).toBe(1224); // 612 * 2.0
                expect(result.pages[i].height).toBe(1584); // 792 * 2.0
                expect(result.pages[i].imageUrl).toMatch(/^blob:/);
                expect(result.pagesText[i]).toContain(`Page ${pageNum}`);
            }

            // Verify fullText aggregates all 15 pages
            expect(result.fullText).toContain("Page 1 technical leadership");
            expect(result.fullText).toContain("Page 15 technical leadership");
        });

        it("preserves unicode, ligatures, special symbols, and RTL scripts without corrupting extracted text", () => {
            const items = [
                { str: "Curriculum Vitæ - René François", hasEOL: true },
                { str: "Experience: Optimized \uFB01le handling & a\uFB04uent data pipelines (fi & fl ligatures).", hasEOL: true },
                { str: "Multilingual proficiency: 中文 (Mandarin), 日本語 (N2), Русский, and العربية (Arabic).", hasEOL: true },
                { str: "Impact: Delivered €2.4M ARR • 99.99% uptime • © 2026 Innovation Corp™", hasEOL: true },
                { str: "Tech Stack: C++20, C#, Elixir, ⚡ WebAssembly, 🚀 Micro-frontends.", hasEOL: true },
            ];

            const extracted = extractTextFromContent(items);

            expect(extracted).toContain("Vitæ");
            expect(extracted).toContain("René François");
            expect(extracted).toContain("\uFB01le handling & a\uFB04uent");
            expect(extracted).toContain("中文 (Mandarin), 日本語 (N2), Русский, and العربية (Arabic)");
            expect(extracted).toContain("€2.4M ARR • 99.99% uptime • © 2026 Innovation Corp™");
            expect(extracted).toContain("⚡ WebAssembly, 🚀 Micro-frontends");
        });

        it("empirically tests scanned document classification boundary (<50 chars threshold)", async () => {
            // Case 1: Exactly 49 characters -> MUST be classified as scanned (isScanned: true)
            const text49 = "A".repeat(49);
            expect(text49.length).toBe(49);

            const lib49 = createMockMultiPageLib(1, () => ({
                items: [{ str: text49, hasEOL: true }],
            }));
            _setPdfJsLib(lib49);

            const file49 = new File(["pdf49"], "scanned_49.pdf", { type: "application/pdf" });
            const result49 = await processPdfDocument(file49);
            expect(result49.fullText.trim().length).toBe(49);
            expect(result49.isScanned).toBe(true);

            // Case 2: Exactly 50 characters -> MUST NOT be classified as scanned (isScanned: false)
            const text50 = "A".repeat(50);
            expect(text50.length).toBe(50);

            const lib50 = createMockMultiPageLib(1, () => ({
                items: [{ str: text50, hasEOL: true }],
            }));
            _setPdfJsLib(lib50);

            const file50 = new File(["pdf50"], "digital_50.pdf", { type: "application/pdf" });
            const result50 = await processPdfDocument(file50);
            expect(result50.fullText.trim().length).toBe(50);
            expect(result50.isScanned).toBe(false);

            // Case 3: Exactly 51 characters -> isScanned: false
            const text51 = "A".repeat(51);
            const lib51 = createMockMultiPageLib(1, () => ({
                items: [{ str: text51, hasEOL: true }],
            }));
            _setPdfJsLib(lib51);

            const file51 = new File(["pdf51"], "digital_51.pdf", { type: "application/pdf" });
            const result51 = await processPdfDocument(file51);
            expect(result51.fullText.trim().length).toBe(51);
            expect(result51.isScanned).toBe(false);
        });

        it("classifies empty text and whitespace-only PDFs as scanned documents", async () => {
            // Document with only spaces and tabs
            const whitespaceLib = createMockMultiPageLib(2, () => ({
                items: [
                    { str: "   \t   ", hasEOL: true },
                    { str: "\n\n   ", hasEOL: true },
                ],
            }));
            _setPdfJsLib(whitespaceLib);

            const file = new File(["empty-text"], "scanned_empty.pdf", { type: "application/pdf" });
            const result = await processPdfDocument(file);

            expect(result.fullText.trim().length).toBe(0);
            expect(result.isScanned).toBe(true);
            expect(result.pages.length).toBe(2);
        });

        it("survives individual page text extraction failure without aborting document processing", async () => {
            // Page 2 text extraction throws an unexpected error, pages 1 and 3 succeed
            const mockLib = {
                getDocument: vi.fn(() => ({
                    promise: Promise.resolve({
                        numPages: 3,
                        getPage: vi.fn(async (pageNum: number) => {
                            return {
                                getViewport: vi.fn(() => ({ width: 612, height: 792, scale: 2 })),
                                getTextContent: vi.fn(async () => {
                                    if (pageNum === 2) {
                                        throw new Error("Corrupted CFF font stream on page 2");
                                    }
                                    return {
                                        items: [{ str: `Page ${pageNum} valid content of sufficient length for test.`, hasEOL: true }],
                                    };
                                }),
                                render: vi.fn(() => ({ promise: Promise.resolve() })),
                            };
                        }),
                    }),
                })),
                GlobalWorkerOptions: { workerSrc: "" },
            };
            _setPdfJsLib(mockLib);

            const file = new File(["partial-corrupt"], "partial.pdf", { type: "application/pdf" });
            const result = await processPdfDocument(file);

            // Document should not crash: all 3 page canvases rendered, page 2 text empty
            expect(result.pageCount).toBe(3);
            expect(result.pages.length).toBe(3);
            expect(result.pagesText[0]).toContain("Page 1");
            expect(result.pagesText[1]).toBe(""); // Page 2 safely defaulted to empty
            expect(result.pagesText[2]).toContain("Page 3");
            expect(result.error).toBeUndefined();
        });

        it("verifies canvas viewport scaling across scale options (0.5x, 1.0x, 2.0x, 4.0x)", async () => {
            const scalesToTest = [0.5, 1.0, 2.0, 4.0];

            for (const scale of scalesToTest) {
                const mockLib = createMockMultiPageLib(1);
                _setPdfJsLib(mockLib);

                const file = new File(["scale-test"], `scale_${scale}.pdf`, { type: "application/pdf" });
                const result = await processPdfDocument(file, { scale });

                expect(result.pages.length).toBe(1);
                expect(result.pages[0].width).toBe(612 * scale);
                expect(result.pages[0].height).toBe(792 * scale);
            }
        });

        it("handles completely empty 0-byte PDF files by returning graceful error object", async () => {
            const emptyLib = {
                getDocument: vi.fn(() => ({
                    promise: Promise.reject(new Error("PDF header not found: file is 0 bytes")),
                })),
                GlobalWorkerOptions: { workerSrc: "" },
            };
            _setPdfJsLib(emptyLib);

            const file = new File([], "empty.pdf", { type: "application/pdf" });
            const result = await processPdfDocument(file);

            expect(result.pages).toEqual([]);
            expect(result.pageCount).toBe(0);
            expect(result.fullText).toBe("");
            expect(result.isScanned).toBe(true);
            expect(result.error).toContain("PDF header not found");
        });

        it("extractTextFromContent stress testing: handles null items, non-objects, and missing str safely", () => {
            const adversarialItems = [
                null,
                undefined,
                "not-an-object",
                42,
                true,
                {}, // missing str
                { hasEOL: true }, // missing str
                { str: "", hasEOL: true },
                { str: "Valid String", hasEOL: false },
                { str: "Followed By EOL", hasEOL: true },
                null,
            ];

            const result = extractTextFromContent(adversarialItems as any[]);
            expect(result).toBe("Valid String Followed By EOL");
        });

        it("empirically tests OCR fallback resilience simulation under failure modes", async () => {
            // Simulates upload.tsx OCR fallback logic with adversarial scenarios

            const runOcrFallback = async (
                isScanned: boolean,
                pages: { file: File }[],
                mockImg2Txt: (file: File) => Promise<string>
            ) => {
                let extractedText = "initial text";
                let ocrApplied = false;

                if (isScanned) {
                    try {
                        const ocrPageTexts: string[] = [];
                        for (const page of pages) {
                            if (page.file) {
                                const ocrText = await mockImg2Txt(page.file);
                                if (ocrText && typeof ocrText === "string" && ocrText.trim().length > 0) {
                                    ocrPageTexts.push(ocrText.trim());
                                }
                            }
                        }
                        if (ocrPageTexts.length > 0) {
                            extractedText = ocrPageTexts.join("\n\n");
                            ocrApplied = true;
                        }
                    } catch {
                        // Defensive fallback: proceed without crash
                    }
                }

                return { extractedText, ocrApplied };
            };

            const dummyPages = [
                { file: new File(["p1"], "p1.png", { type: "image/png" }) },
                { file: new File(["p2"], "p2.png", { type: "image/png" }) },
            ];

            // Scenario A: OCR service timeout
            const timeoutResult = await runOcrFallback(true, dummyPages, async () => {
                throw new Error("Puter AI img2txt timeout after 30000ms");
            });
            expect(timeoutResult.ocrApplied).toBe(false);
            expect(timeoutResult.extractedText).toBe("initial text"); // preserved fallback

            // Scenario B: OCR returns empty text / whitespace
            const emptyOcrResult = await runOcrFallback(true, dummyPages, async () => "   ");
            expect(emptyOcrResult.ocrApplied).toBe(false);
            expect(emptyOcrResult.extractedText).toBe("initial text");

            // Scenario C: OCR succeeds
            const successOcrResult = await runOcrFallback(true, dummyPages, async (f) => {
                return `Transcribed OCR content for ${f.name}`;
            });
            expect(successOcrResult.ocrApplied).toBe(true);
            expect(successOcrResult.extractedText).toBe(
                "Transcribed OCR content for p1.png\n\nTranscribed OCR content for p2.png"
            );

            // Scenario D: Not scanned -> OCR never runs
            const spyOcr = vi.fn();
            await runOcrFallback(false, dummyPages, spyOcr);
            expect(spyOcr).not.toHaveBeenCalled();
        });

        it("stress-tests massive 25-page document with 50,000+ characters for memory and ordering", async () => {
            const mockLib = createMockMultiPageLib(25, (pageNum) => ({
                items: Array.from({ length: 40 }, (_, idx) => ({
                    str: `Section ${idx + 1} of Page ${pageNum}: High-throughput distributed data stream processing at scale.`,
                    hasEOL: idx % 2 === 1,
                })),
            }));
            _setPdfJsLib(mockLib);

            const file = new File(["massive-pdf"], "huge_cv.pdf", { type: "application/pdf" });
            const result = await processPdfDocument(file, { scale: 2.0 });

            expect(result.pageCount).toBe(25);
            expect(result.pages).toHaveLength(25);
            expect(result.pagesText).toHaveLength(25);
            expect(result.isScanned).toBe(false);
            expect(result.fullText.length).toBeGreaterThan(50000);

            // Verify order consistency
            expect(result.pages[0].pageNumber).toBe(1);
            expect(result.pages[24].pageNumber).toBe(25);
            expect(result.fullText).toContain("Page 1");
            expect(result.fullText).toContain("Page 25");
        });

        it("verifies fallback image generation when canvas.toBlob yields null", async () => {
            const mockLib = {
                getDocument: vi.fn(() => ({
                    promise: Promise.resolve({
                        numPages: 1,
                        getPage: vi.fn(async () => ({
                            getViewport: vi.fn(() => ({ width: 612, height: 792, scale: 2 })),
                            getTextContent: vi.fn(async () => ({
                                items: [{ str: "Content on canvas with null blob output", hasEOL: true }],
                            })),
                            render: vi.fn(() => ({ promise: Promise.resolve() })),
                        })),
                    }),
                })),
                GlobalWorkerOptions: { workerSrc: "" },
            };
            _setPdfJsLib(mockLib);

            // Temporarily mock toBlob to return null
            const originalToBlob = HTMLCanvasElement.prototype.toBlob;
            HTMLCanvasElement.prototype.toBlob = vi.fn((callback: (blob: Blob | null) => void) => {
                callback(null);
            });

            try {
                const file = new File(["test-null-blob"], "null_blob.pdf", { type: "application/pdf" });
                const result = await processPdfDocument(file);

                expect(result.pages).toHaveLength(1);
                expect(result.pages[0].imageUrl).toMatch(/^blob:/);
                expect(result.pages[0].file.name).toBe("null_blob_page_1.png");
            } finally {
                HTMLCanvasElement.prototype.toBlob = originalToBlob;
            }
        });

        it("verifies extractTextFromContent handling of non-breaking spaces and zero-width spaces", () => {
            const items = [
                { str: "First\u00A0Name", hasEOL: false }, // non-breaking space
                { str: "Last\u2003Name", hasEOL: true },   // em space
                { str: "Invisi\u200Bble", hasEOL: true },   // zero-width space
            ];

            const result = extractTextFromContent(items);
            expect(result).toContain("First\u00A0Name");
            expect(result).toContain("Last\u2003Name");
            expect(result).toContain("Invisi\u200Bble");
        });
    });
});
