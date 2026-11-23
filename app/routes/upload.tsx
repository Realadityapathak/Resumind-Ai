import { type FormEvent, useState, useRef, useEffect } from 'react'
import Navbar from "~/components/layout/Navbar";
import FileUploader from "~/features/upload/FileUploader";
import AuthGuard from "~/components/auth/AuthGuard";
import Icon from "~/components/ui/Icon";
import { usePuterStore } from "~/services/puter/store";
import { useNavigate } from "react-router";
import { processPdfDocument } from "~/services/pdf/processPdfDocument";
import { safeJsonParse } from "~/utils/json";
import { generateUUID } from "~/utils/uuid";
import { prepareInstructions } from "~/features/resume-analysis/prompt";

const UploadContent = () => {
    const { auth, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const isMountedRef = useRef(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const safeSetStatusText = (text: string) => {
        if (isMountedRef.current) setStatusText(text);
    };

    const handleFileSelect = (file: File | null) => {
        setFile(file);
    };

    const handleAnalyze = async ({
        companyName,
        jobTitle,
        jobDescription,
        file,
    }: {
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        file: File;
    }) => {
        if (isProcessing) return;
        setIsProcessing(true);
        let pdfResult: Awaited<ReturnType<typeof processPdfDocument>> | null = null;
        const uploadedPaths: string[] = [];

        const rollbackUploads = async () => {
            if (uploadedPaths.length === 0) return;
            const results = await Promise.allSettled(
                uploadedPaths.map((path) => fs.delete(path))
            );
            results.forEach((result, index) => {
                if (result.status === "rejected") {
                    console.warn(`Upload rollback failed for ${uploadedPaths[index]}:`, result.reason);
                }
            });
        };

        try {
            // Step 1: Upload original PDF document to Puter FS
            safeSetStatusText("Uploading resume document...");
            const uploadedFile = await fs.upload([file]);
            if (!uploadedFile?.path) {
                throw new Error("Failed to upload file");
            }
            uploadedPaths.push(uploadedFile.path);

            // Step 2: Multi-page text extraction & preview rendering
            safeSetStatusText("Processing resume pages & extracting text...");
            pdfResult = await processPdfDocument(file, { scale: 2.0 });

            if (pdfResult.pages.length === 0 && pdfResult.error) {
                throw new Error(pdfResult.error);
            }

            let extractedText = pdfResult.fullText;
            const isScanned = pdfResult.isScanned;
            let ocrApplied = false;

            // Step 3: Scanned PDF Detection & OCR Fallback via puter.ai.img2txt()
            if (isScanned) {
                safeSetStatusText("Scanned resume detected. Running AI OCR text recognition...");
                try {
                    const ocrPageTexts: string[] = [];
                    for (const page of pdfResult.pages) {
                        if (page.file) {
                            const ocrText = await ai.img2txt(page.file);
                            if (ocrText && typeof ocrText === "string" && ocrText.trim().length > 0) {
                                ocrPageTexts.push(ocrText.trim());
                            }
                        }
                    }
                    if (ocrPageTexts.length > 0) {
                        extractedText = ocrPageTexts.join("\n\n");
                        ocrApplied = true;
                    }
                } catch (ocrError) {
                    console.warn("OCR recognition fallback error:", ocrError);
                    // Defensive fallback: proceed with whatever text was extracted
                }
            }

            // Step 4: Upload all rendered page preview images to Puter FS
            safeSetStatusText(`Uploading ${pdfResult.pages.length} page preview${pdfResult.pages.length > 1 ? "s" : ""}...`);
            const uploadedImagePaths: string[] = [];
            for (const page of pdfResult.pages) {
                if (page.file) {
                    const uploadedImg = await fs.upload([page.file]);
                    if (uploadedImg?.path) {
                        uploadedImagePaths.push(uploadedImg.path);
                        uploadedPaths.push(uploadedImg.path);
                    }
                }
                // Revoke client-side object URL immediately after upload
                if (page.imageUrl) {
                    URL.revokeObjectURL(page.imageUrl);
                }
            }

            const primaryImagePath = uploadedImagePaths[0] || "";

            // Step 5: Multi-dimensional AI Feedback via Gemini 2.5 Flash
            safeSetStatusText("Analyzing resume with Gemini AI...");
            let strictness: EvaluationStrictness | undefined;
            const currentUser = auth?.getUser?.() || auth?.user;
            if (currentUser?.uuid) {
                try {
                    const rawProfile = await kv.get(`user_profile:${currentUser.uuid}`);
                    const parsedProfile = safeJsonParse<UserProfile | null>(rawProfile, null);
                    if (parsedProfile?.preferences?.evaluationStrictness) {
                        strictness = parsedProfile.preferences.evaluationStrictness;
                    }
                } catch {
                    // Non-blocking fallback
                }
            }

            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription, strictness })
            );

            if (!feedback || !feedback.message) {
                throw new Error("Failed to analyze resume. Please try again.");
            }

            const feedbackText =
                typeof feedback.message.content === "string"
                    ? feedback.message.content
                    : feedback.message.content[0].text;

            const parsedFeedback = safeJsonParse<Feedback | null>(feedbackText, null);

            if (!parsedFeedback || typeof parsedFeedback.overallScore !== "number") {
                console.error("Invalid AI feedback structure:", feedbackText);
                throw new Error("Failed to parse AI feedback. Please try again.");
            }

            // Step 6: Atomic persistence in Puter KV
            safeSetStatusText("Saving evaluation...");
            const uuid = generateUUID();
            const now = new Date().toISOString();

            const resumeRecord: Resume = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: primaryImagePath,
                imagePaths: uploadedImagePaths,
                pageCount: pdfResult.pageCount || 1,
                parsedText: extractedText,
                isScanned,
                ocrApplied,
                fileName: file.name,
                fileSize: file.size,
                companyName: companyName?.trim() || "",
                jobTitle: jobTitle?.trim() || "",
                jobDescription: jobDescription?.trim() || "",
                createdAt: now,
                updatedAt: now,
                feedback: parsedFeedback,
            };

            const saved = await kv.set(`resume:${uuid}`, JSON.stringify(resumeRecord));
            if (!saved) {
                throw new Error("Failed to save resume record");
            }

            // Step 7: Redirect to Workspace (passing initialResume in state for instant zero-latency loading)
            if (isMountedRef.current) {
                safeSetStatusText("Analysis complete, redirecting...");
                navigate(`/resume/${uuid}`, { state: { initialResume: resumeRecord } });
            }
        } catch (error) {
            console.error("Upload pipeline error:", error);
            await rollbackUploads();
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : "Error while analyzing resume. Please try again.";
            if (isMountedRef.current) {
                setStatusText(`Error: ${message}`);
                setIsProcessing(false);
            }
        } finally {
            if (pdfResult?.pages && Array.isArray(pdfResult.pages)) {
                for (const page of pdfResult.pages) {
                    if (page.imageUrl) {
                        try {
                            URL.revokeObjectURL(page.imageUrl);
                        } catch {
                            // Defensive: ignore revocation errors
                        }
                    }
                }
            }
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if (!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if (!file) {
            setStatusText("Please select or drop a PDF resume first.");
            return;
        }

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    };

    return (
        <main className="min-h-screen bg-paper">
            <Navbar />

            <section className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-20">
                {/* Brief */}
                <div className="lg:sticky lg:top-28 lg:self-start">
                    <p className="eyebrow">The diagnostic</p>
                    <h1 className="mt-5 !text-[clamp(2.5rem,5.2vw,4.2rem)] !leading-[0.98] !tracking-[-0.05em] text-balance">
                        Smart feedback for your dream job
                    </h1>

                    {isProcessing ? (
                        <h2
                            key={statusText}
                            aria-live="polite"
                            className="mt-6 animate-fadeIn !text-[17px] !leading-relaxed !tracking-normal !text-ink-2"
                        >
                            {statusText}
                        </h2>
                    ) : (
                        <h2 className="mt-6 !text-[16px] !font-normal !leading-[1.75] !tracking-normal !text-ink-3">
                            Drop your resume for an ATS score and improvement tips
                        </h2>
                    )}

                    <div className="mt-10 border-t border-rule">
                        <div className="flex gap-4 border-b border-rule py-4">
                            <span className="text-[11px] font-semibold tabular-nums text-cobalt">01</span>
                            <div>
                                <p className="text-[13px] font-semibold text-ink">Upload the source PDF</p>
                                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                                    Multi-page documents are parsed in the browser and rendered page by page.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 border-b border-rule py-4">
                            <span className="text-[11px] font-semibold tabular-nums text-cobalt">02</span>
                            <div>
                                <p className="text-[13px] font-semibold text-ink">Add the target role</p>
                                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                                    The company and job description give the evaluation something concrete to measure.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 py-4">
                            <span className="text-[11px] font-semibold tabular-nums text-cobalt">03</span>
                            <div>
                                <p className="text-[13px] font-semibold text-ink">Read the diagnostic</p>
                                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                                    Score, strengths, missing keywords, and the bullet points worth rewriting.
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-ink-4">
                        <Icon name="lock" size={13} className="mt-0.5 shrink-0" />
                        Files are stored in your own Puter Cloud account. Nothing is sent to a central
                        resume database.
                    </p>
                </div>

                {/* Form / progress sheet */}
                <div className="border border-rule bg-surface">
                    <div className="flex items-center justify-between border-b border-rule px-5 py-3">
                        <p className="text-[11px] font-semibold text-ink">New evaluation</p>
                        <p className="text-[10px] text-ink-4">PDF · max 20 MB</p>
                    </div>

                    {isProcessing ? (
                        <div className="animate-fadeIn p-6 sm:p-8">
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-rule border-t-cobalt" />
                                <p className="text-[13px] font-medium text-ink-2">Working through your resume</p>
                            </div>

                            <div className="mt-8 border border-rule bg-white p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-[10px] font-medium text-ink-3">Processing</span>
                                    <span className="text-[10px] text-ink-4">Gemini 2.5 Flash</span>
                                </div>
                                <div className="relative h-[220px] overflow-hidden border border-rule bg-surface">
                                    <div className="space-y-3 p-5">
                                        <div className="h-2 w-1/2 bg-rule" />
                                        <div className="h-1.5 w-full bg-rule/70" />
                                        <div className="h-1.5 w-11/12 bg-rule/70" />
                                        <div className="h-1.5 w-4/5 bg-rule/70" />
                                        <div className="pt-3">
                                            <div className="h-2 w-1/3 bg-rule" />
                                        </div>
                                        <div className="h-1.5 w-full bg-rule/70" />
                                        <div className="h-1.5 w-10/12 bg-rule/70" />
                                        <div className="h-1.5 w-9/12 bg-rule/70" />
                                    </div>
                                    <div className="absolute inset-x-0 top-0 h-px animate-[scanLine_2.4s_ease-in-out_infinite] bg-cobalt" />
                                </div>
                            </div>

                            <div className="mt-6 border-t border-rule pt-4">
                                <p className="text-[11px] leading-relaxed text-ink-3">
                                    Keep this tab open. The workspace opens automatically when the
                                    evaluation is saved.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form id="upload-form" onSubmit={handleSubmit} className="!w-full !gap-0">
                            {statusText && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2 border-b border-rule bg-red-50 px-5 py-3 text-[11px] leading-relaxed text-red-800 sm:px-6"
                                >
                                    <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
                                    <span>{statusText}</span>
                                </div>
                            )}
                            <div className="grid w-full grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
                                <div className="form-div sm:col-span-1">
                                    <label htmlFor="company-name">Company Name</label>
                                    <input type="text" name="company-name" placeholder="e.g. Stripe" id="company-name" />
                                </div>
                                <div className="form-div sm:col-span-1">
                                    <label htmlFor="job-title">Job Title</label>
                                    <input type="text" name="job-title" placeholder="e.g. Senior Engineer" id="job-title" />
                                </div>
                                <div className="form-div sm:col-span-2">
                                    <label htmlFor="job-description">Job Description</label>
                                    <textarea
                                        rows={5}
                                        name="job-description"
                                        placeholder="Paste the job description or the requirements that matter most."
                                        id="job-description"
                                    />
                                </div>
                                <div className="form-div sm:col-span-2">
                                    <label htmlFor="uploader">Upload Resume</label>
                                    <FileUploader onFileSelect={handleFileSelect} />
                                </div>
                            </div>

                            <div className="flex w-full flex-col gap-3 border-t border-rule px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <p className="text-[11px] leading-relaxed text-ink-4">
                                    Your resume stays in your Puter account.
                                </p>
                                <button className="primary-button w-full sm:w-auto" type="submit">
                                    Analyze Resume
                                    <Icon name="arrow-right" size={15} />
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

export default function Upload() {
    return (
        <AuthGuard>
            <UploadContent />
        </AuthGuard>
    );
}
