import { useState, useEffect, useMemo, type FC } from "react";
import Icon from "~/components/ui/Icon";
import { useSafeTimeout } from "~/hooks/useSafeTimeout";

interface PdfPreviewerProps {
    resumeUrl?: string;          // Blob or URL of original PDF
    imageUrl?: string;           // Blob URL of page 1 image
    imageUrls?: string[];       // Array of blob URLs for all pages
    parsedText?: string;        // Extracted plain text
    fileName?: string;
    pageCount?: number;
    isLoading?: boolean;
    isScanned?: boolean;
    ocrApplied?: boolean;
}

const PdfPreviewer: FC<PdfPreviewerProps> = ({
    resumeUrl,
    imageUrl,
    imageUrls,
    parsedText = "",
    fileName = "resume.pdf",
    pageCount = 1,
    isLoading = false,
    isScanned = false,
    ocrApplied = false,
}) => {
    const [viewMode, setViewMode] = useState<"visual" | "text">("visual");
    const [currentPage, setCurrentPage] = useState(1);
    const [zoomScale, setZoomScale] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copied, setCopied] = useState(false);
    const scheduleTimeout = useSafeTimeout();

    // Compute all page images
    const allImages = imageUrls && imageUrls.length > 0
        ? imageUrls
        : (imageUrl ? [imageUrl] : []);

    const totalPages = Math.max(pageCount || 1, allImages.length || 1);

    // Clamp current page within bounds if totalPages changes
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    // Handle ESC key for fullscreen (only listen when fullscreen is active)
    useEffect(() => {
        if (!isFullscreen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsFullscreen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullscreen]);

    const currentImageSrc = allImages[currentPage - 1] || imageUrl || "";

    const { wordCount, charCount } = useMemo(() => {
        if (!parsedText || typeof parsedText !== "string") return { wordCount: 0, charCount: 0 };
        return {
            wordCount: parsedText.split(/\s+/).filter(Boolean).length,
            charCount: parsedText.length,
        };
    }, [parsedText]);

    const handleCopyText = async () => {
        if (!parsedText || typeof parsedText !== "string") return;
        try {
            await navigator.clipboard.writeText(parsedText);
            setCopied(true);
            scheduleTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text:", err);
        }
    };

    const handleZoomIn = () => {
        setZoomScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))));
    };

    const handleZoomOut = () => {
        setZoomScale((s) => Math.max(0.5, Number((s - 0.15).toFixed(2))));
    };

    const handleZoomFit = () => {
        setZoomScale(1.0);
    };

    const renderViewerContent = () => {
        if (isLoading) {
            return (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-ink-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-rule border-t-cobalt" />
                    <p className="text-[12px]">Loading document preview...</p>
                </div>
            );
        }

        if (viewMode === "visual") {
            if (!currentImageSrc) {
                return (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-ink-4">
                        <span className="flex h-10 w-10 items-center justify-center border border-rule bg-surface">
                            <Icon name="file" size={18} />
                        </span>
                        <p className="mt-4 text-[12px] font-medium text-ink-2">No preview image available</p>
                        {resumeUrl && (
                            <a
                                href={resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-cobalt hover:text-cobalt-deep"
                            >
                                Open PDF in new tab
                                <Icon name="external" size={12} />
                            </a>
                        )}
                    </div>
                );
            }

            return (
                <div
                    key={`${currentPage}-${currentImageSrc}`}
                    className="pdf-page-in flex min-h-full items-start justify-center p-4 transition-transform duration-150 ease-out"
                    style={{
                        transform: `scale(${zoomScale})`,
                        transformOrigin: "top center",
                    }}
                >
                    <img
                        src={currentImageSrc}
                        alt={`Resume Page ${currentPage}`}
                        className="h-auto max-w-full rounded-[2px] border border-rule bg-white select-none"
                    />
                </div>
            );
        }

        // Preserve the legacy placeholder when PDF text extraction yields an empty string.
        return (
            <div className="flex h-full w-full flex-col border border-rule bg-surface">
                <div className="flex items-center justify-between gap-2 border-b border-rule px-3 py-2 text-[11px] text-ink-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="tabular-nums">{wordCount} words</span>
                        <span className="text-ink-4">·</span>
                        <span className="tabular-nums">{charCount} characters</span>
                        {isScanned && (
                            <span className="border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                                {ocrApplied ? "OCR Transcribed" : "Scanned Document"}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleCopyText}
                        className="shrink-0 cursor-pointer text-[11px] font-semibold text-cobalt hover:text-cobalt-deep"
                    >
                        {copied ? "Copied!" : "Copy All Text"}
                    </button>
                </div>
                <pre className="flex-1 select-text overflow-y-auto whitespace-pre-wrap border-0 bg-paper p-4 font-mono text-[11px] leading-relaxed text-ink-2">
                    {parsedText || "No plaintext layer extracted from this document."}
                </pre>
            </div>
        );
    };

    return (
        <div className="flex h-full flex-col overflow-hidden border border-rule bg-surface">
            {/* Toolbar */}
            <div className="flex select-none flex-wrap items-center justify-between gap-2 border-b border-rule bg-surface-2 px-2.5 py-2">
                {/* View switcher */}
                <div className="flex items-center border border-rule bg-paper p-0.5">
                    <button
                        type="button"
                        onClick={() => setViewMode("visual")}
                        className={`flex min-h-[40px] cursor-pointer items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold transition-colors sm:text-[11px] lg:min-h-[32px] ${
                            viewMode === "visual"
                                ? "bg-ink text-paper"
                                : "text-ink-3 hover:text-ink"
                        }`}
                    >
                        <Icon name="eye" size={12} />
                        Visual Preview
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("text")}
                        className={`flex min-h-[40px] cursor-pointer items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold transition-colors sm:text-[11px] lg:min-h-[32px] ${
                            viewMode === "text"
                                ? "bg-ink text-paper"
                                : "text-ink-3 hover:text-ink"
                        }`}
                    >
                        <Icon name="list" size={12} />
                        Plaintext
                    </button>
                </div>

                {/* Page Navigation */}
                {viewMode === "visual" && totalPages > 1 && (
                    <div className="flex items-center gap-1 border border-rule bg-paper px-1 py-0.5">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 lg:min-h-[30px] lg:min-w-[30px]"
                            title="Previous page"
                            aria-label="Previous page"
                        >
                            <Icon name="chevron-left" size={13} />
                        </button>
                        <span className="px-1 text-[10px] font-medium tabular-nums text-ink-2">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 lg:min-h-[30px] lg:min-w-[30px]"
                            title="Next page"
                            aria-label="Next page"
                        >
                            <Icon name="chevron-right" size={13} />
                        </button>
                    </div>
                )}

                {/* Zoom & Action Controls */}
                {viewMode === "visual" && (
                    <div className="flex items-center gap-0.5">
                        <button
                            type="button"
                            onClick={handleZoomOut}
                            disabled={zoomScale <= 0.5}
                            className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center text-ink-2 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-30 lg:min-h-[32px] lg:min-w-[32px]"
                            title="Zoom out"
                            aria-label="Zoom out"
                        >
                            <Icon name="minus" size={13} />
                        </button>
                        <span className="w-9 text-center text-[10px] font-medium tabular-nums text-ink-2">
                            {Math.round(zoomScale * 100)}%
                        </span>
                        <button
                            type="button"
                            onClick={handleZoomIn}
                            disabled={zoomScale >= 2.0}
                            className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center text-ink-2 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-30 lg:min-h-[32px] lg:min-w-[32px]"
                            title="Zoom in"
                            aria-label="Zoom in"
                        >
                            <Icon name="plus" size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={handleZoomFit}
                            className="flex min-h-[40px] cursor-pointer items-center justify-center px-2 text-[10px] font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink lg:min-h-[32px]"
                            title="Reset zoom to 100%"
                        >
                            Fit
                        </button>
                        <span className="mx-0.5 hidden h-4 w-px bg-rule sm:block" />
                        <button
                            type="button"
                            onClick={() => setIsFullscreen(true)}
                            className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink lg:min-h-[32px] lg:min-w-[32px]"
                            title="Fullscreen preview"
                            aria-label="Fullscreen"
                        >
                            <Icon name="layout" size={13} />
                        </button>
                        {resumeUrl && (
                            <a
                                href={resumeUrl}
                                download={fileName}
                                className="flex min-h-[32px] min-w-[32px] items-center justify-center text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                                title="Download PDF document"
                                aria-label="Download PDF"
                            >
                                <Icon name="download" size={13} />
                            </a>
                        )}
                    </div>
                )}
            </div>

            {/* Viewer Scrollable Body */}
            <div className="relative flex-1 overflow-auto bg-surface-2">
                {renderViewerContent()}
            </div>

            {/* Thumbnail Strip */}
            {totalPages > 1 && viewMode === "visual" && (
                <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-rule bg-surface px-2.5 py-2">
                    {allImages.map((src, idx) => {
                        const pageNum = idx + 1;
                        const isActive = currentPage === pageNum;
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setCurrentPage(pageNum)}
                                className={`relative h-16 w-12 shrink-0 cursor-pointer overflow-hidden border transition-colors ${
                                    isActive
                                        ? "border-cobalt"
                                        : "border-rule opacity-70 hover:border-rule-strong hover:opacity-100"
                                }`}
                                aria-label={`Go to page ${pageNum}`}
                            >
                                <img
                                    src={src}
                                    alt={`Page ${pageNum}`}
                                    className="h-full w-full object-cover"
                                />
                                <span className="absolute inset-x-0 bottom-0 bg-ink/75 py-0.5 text-center text-[8px] font-medium text-paper">
                                    P. {pageNum}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Fullscreen Overlay Modal */}
            {isFullscreen && (
                <div className="pdf-fullscreen-in fixed inset-0 z-50 flex flex-col bg-ink/90 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-3 text-paper">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="truncate text-[12px] font-semibold">{fileName}</span>
                            {totalPages > 1 && (
                                <span className="shrink-0 text-[11px] tabular-nums text-paper/60">
                                    Page {currentPage} of {totalPages}
                                </span>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={handleZoomOut}
                                className="min-h-[40px] min-w-[40px] cursor-pointer border border-white/20 px-2 py-1 text-xs text-paper transition-colors hover:bg-white/10"
                            >
                                -
                            </button>
                            <span className="text-[11px] tabular-nums text-paper/70">{Math.round(zoomScale * 100)}%</span>
                            <button
                                type="button"
                                onClick={handleZoomIn}
                                className="min-h-[40px] min-w-[40px] cursor-pointer border border-white/20 px-2 py-1 text-xs text-paper transition-colors hover:bg-white/10"
                            >
                                +
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFullscreen(false)}
                                className="ml-2 min-h-[40px] cursor-pointer bg-paper px-3 py-1 text-[11px] font-semibold text-ink transition-colors hover:bg-white"
                            >
                                Close (Esc)
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-1 items-center justify-center overflow-auto p-4">
                        <div
                            style={{
                                transform: `scale(${zoomScale})`,
                                transformOrigin: "center center",
                            }}
                        >
                            <img
                                src={currentImageSrc}
                                alt={`Page ${currentPage}`}
                                className="max-h-[85vh] w-auto rounded-[2px] bg-white"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PdfPreviewer;
