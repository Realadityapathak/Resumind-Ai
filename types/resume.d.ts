// ==========================================
// RESUME & DOCUMENT TYPES (Ambient Global)
// ==========================================

interface Resume {
    id: string;
    companyName?: string;
    jobTitle?: string;
    jobDescription?: string;
    imagePath: string;              // Primary thumbnail (Page 1) for backward compatibility
    imagePaths?: string[];          // All rendered page images: [page1Path, page2Path, ...]
    resumePath: string;             // Puter FS path to the uploaded PDF
    parsedText?: string;            // Extracted plain text (via pdfjs or OCR fallback)
    pageCount?: number;             // Total number of pages in the PDF
    isScanned?: boolean;            // Flag: true if text layer had < 50 characters
    ocrApplied?: boolean;           // Flag: true if OCR fallback was executed
    fileName?: string;
    fileSize?: number;
    createdAt?: string;
    updatedAt?: string;
    feedback: Feedback;
    keywordAnalysis?: KeywordAnalysis;
    savedStarRewrites?: StarRewriteResult[];
    coverLetters?: CoverLetter[];
    interviewPrep?: InterviewPrepSection;
    copilotChat?: CopilotMessage[];
}
// ==========================================
// RESUME FEEDBACK EVALUATION TYPES
// ==========================================

interface Feedback {
    overallScore: number;
    ATS: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
        }[];
    };
    toneAndStyle: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    content: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    structure: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    skills: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
}
