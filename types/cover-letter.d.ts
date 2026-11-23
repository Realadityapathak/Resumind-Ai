// ==========================================
// COVER LETTER GENERATOR & EXPORTER TYPES
// ==========================================

type CoverLetterTone =
    | "professional"
    | "passionate"
    | "executive"
    | "conversational";
interface CoverLetter {
    id: string;
    roleTitle?: string;
    jobTitle?: string;
    companyName: string;
    tone: CoverLetterTone;
    subjectLine: string;
    salutation: string;
    hookParagraph: string;
    bodyParagraphs: string[]; // 2-3 targeted body paragraphs
    closingParagraph: string;
    signOff: string;
    fullText: string;
    wordCount?: number;
    readingTimeMinutes?: number;
    createdAt: string;
    updatedAt?: string;
}
