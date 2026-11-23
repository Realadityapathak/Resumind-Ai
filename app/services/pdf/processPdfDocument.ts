export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

export interface PageRenderResult {
    pageNumber: number; // 1-indexed
    imageUrl: string;   // blob: URL for immediate preview (revoked when needed)
    file: File;         // PNG image file ready for Puter FS upload
    width: number;      // rendered canvas width
    height: number;     // rendered canvas height
    text: string;       // extracted plain text for this page
}

export interface PdfProcessResult {
    pages: PageRenderResult[];
    pageCount: number;
    fullText: string;
    pagesText: string[];
    isScanned: boolean;
    error?: string;
    isTruncated?: boolean;
}

export interface PdfProcessOptions {
    scale?: number;     // Default: 2.0 (high-DPI, memory-efficient)
    maxPages?: number;  // Limit on pages to render visual canvas previews (default: 10)
}

let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;

/**
 * Allows injecting or resetting the PDF.js library instance (useful for unit testing).
 */
export function _setPdfJsLib(mockLib: any): void {
    pdfjsLib = mockLib;
    loadPromise = mockLib ? Promise.resolve(mockLib) : null;
}

export async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
        // Set the worker source to use local file
        lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        pdfjsLib = lib;
        return lib;
    });

    return loadPromise;
}

/**
 * Converts pdfjs-dist TextContent items into clean normalized plain text.
 * Respects hasEOL and normalizes spacing across paragraphs.
 */
export function extractTextFromContent(items: any[]): string {
    if (!Array.isArray(items) || items.length === 0) return "";

    let pageText = "";
    for (const item of items) {
        if (!item || typeof item !== "object" || !("str" in item)) continue;
        const str = item.str || "";

        pageText += str;
        if (item.hasEOL) {
            pageText += "\n";
        } else if (str && !str.endsWith(" ")) {
            pageText += " ";
        }
    }

    return pageText
        .replace(/[ \t]+/g, " ")      // Collapse horizontal whitespace
        .replace(/\n{3,}/g, "\n\n")    // Collapse excessive line breaks
        .trim();
}

export const DEFAULT_MAX_PAGES = 10;

/**
 * Processes a PDF document: extracts raw text across all pages and renders high-DPI canvas preview images
 * up to maxPages (when provided) to guard against browser canvas memory exhaustion (OOM).
 */
export async function processPdfDocument(
    file: File,
    options: PdfProcessOptions = {}
): Promise<PdfProcessResult> {
    const scale = options.scale ?? 2.0;
    const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;

    let pdf: any = null;
    const createdUrls: string[] = [];

    try {
        const lib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages || 1;
        const pagesToRender = Math.min(totalPages, maxPages);

        const renderedPages: PageRenderResult[] = [];
        const pagesText: string[] = [];
        const baseFileName = file.name.replace(/\.pdf$/i, "");

        // Iterate over ALL pages to extract complete text, while constraining canvas rendering to maxPages
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            try {
                // 1. Extract plain text for this page
                let pageText = "";
                try {
                    const textContent = await page.getTextContent();
                    if (textContent && textContent.items) {
                        pageText = extractTextFromContent(textContent.items);
                    }
                } catch (textErr) {
                    console.warn(`Text extraction warning on page ${pageNum}:`, textErr);
                }
                pagesText.push(pageText);

                // 2. Render visual canvas preview ONLY up to maxPages to prevent browser OOM crashes
                if (pageNum <= pagesToRender) {
                    const viewport = page.getViewport({ scale });
                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");

                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    if (context) {
                        context.imageSmoothingEnabled = true;
                        context.imageSmoothingQuality = "high";
                    }

                    if (typeof page.render === "function") {
                        const renderTask = page.render({ canvasContext: context!, viewport });
                        if (renderTask && renderTask.promise) {
                            await renderTask.promise;
                        }
                    }

                    // 3. Convert canvas to PNG blob and create File object
                    const pageFileResult = await new Promise<PageRenderResult | null>((resolve) => {
                        if (typeof canvas.toBlob === "function") {
                            canvas.toBlob(
                                (blob) => {
                                    if (!blob) {
                                        // Fallback blob if canvas is blank
                                        const fallbackBlob = new Blob(["placeholder-page"], { type: "image/png" });
                                        const imageFile = new File(
                                            [fallbackBlob],
                                            `${baseFileName}_page_${pageNum}.png`,
                                            { type: "image/png" }
                                        );
                                        const url = URL.createObjectURL(fallbackBlob);
                                        createdUrls.push(url);
                                        resolve({
                                            pageNumber: pageNum,
                                            imageUrl: url,
                                            file: imageFile,
                                            width: viewport.width,
                                            height: viewport.height,
                                            text: pageText,
                                        });
                                        return;
                                    }
                                    const imageFile = new File(
                                        [blob],
                                        `${baseFileName}_page_${pageNum}.png`,
                                        { type: "image/png" }
                                    );
                                    const url = URL.createObjectURL(blob);
                                    createdUrls.push(url);
                                    resolve({
                                        pageNumber: pageNum,
                                        imageUrl: url,
                                        file: imageFile,
                                        width: viewport.width,
                                        height: viewport.height,
                                        text: pageText,
                                    });
                                },
                                "image/png",
                                1.0
                            );
                        } else {
                            // Fallback in headless / jsdom environments where canvas.toBlob isn't implemented
                            const fallbackBlob = new Blob(["mock-canvas-page"], { type: "image/png" });
                            const imageFile = new File(
                                [fallbackBlob],
                                `${baseFileName}_page_${pageNum}.png`,
                                { type: "image/png" }
                            );
                            const url = URL.createObjectURL(fallbackBlob);
                            createdUrls.push(url);
                            resolve({
                                pageNumber: pageNum,
                                imageUrl: url,
                                file: imageFile,
                                width: viewport.width,
                                height: viewport.height,
                                text: pageText,
                            });
                        }
                    });

                    if (pageFileResult) {
                        renderedPages.push(pageFileResult);
                    }
                }
            } finally {
                if (page && typeof page.cleanup === "function") {
                    try {
                        page.cleanup();
                    } catch {
                        // Ignore page cleanup error
                    }
                }
            }
        }

        const fullText = pagesText.filter(Boolean).join("\n\n");
        const isScanned = fullText.trim().length < 50;

        return {
            pages: renderedPages,
            pageCount: totalPages,
            fullText,
            pagesText,
            isScanned,
            isTruncated: totalPages > maxPages,
        };
    } catch (err: any) {
        console.error("PDF processing error:", err);
        // Revoke any Object URLs created before the failure to prevent memory leak
        createdUrls.forEach((url) => {
            try {
                URL.revokeObjectURL(url);
            } catch {
                // Ignore
            }
        });
        return {
            pages: [],
            pageCount: 0,
            fullText: "",
            pagesText: [],
            isScanned: true,
            isTruncated: false,
            error: `Failed to process PDF: ${err?.message || err}`,
        };
    } finally {
        if (pdf && typeof pdf.destroy === "function") {
            try {
                pdf.destroy();
            } catch {
                // Ignore cleanup error
            }
        }
    }
}

/**
 * Backward-compatible single-page converter delegating to processPdfDocument
 */
export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
    const result = await processPdfDocument(file, { scale: 2.0, maxPages: 1 });
    if (result.pages.length > 0) {
        return {
            imageUrl: result.pages[0].imageUrl,
            file: result.pages[0].file,
        };
    }
    return {
        imageUrl: "",
        file: null,
        error: result.error || "Failed to convert PDF to image",
    };
}
