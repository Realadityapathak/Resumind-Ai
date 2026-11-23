// ==========================================
// INTERVIEW PREPARATION ENGINE TYPES
// ==========================================

type InterviewQuestionCategory = "behavioral" | "technical" | "situational";

interface StarModelAnswer {
    situation: string;
    task: string;
    action: string;
    result: string;
    fullAnswer: string;
}

interface InterviewQuestion {
    id: string;
    category: InterviewQuestionCategory;
    question: string;
    recruiterIntent: string;
    resumeAnchor: string;
    starModelAnswer: StarModelAnswer;
    pitfallsToAvoid: string[];
    userPracticeResponse?: string;   // Scratchpad response drafted by candidate
    userNotes?: string;              // Notes alias for user scratchpad
    isBookmarked?: boolean;          // High-priority star/bookmark toggle
    lastPracticedAt?: string;        // ISO timestamp of candidate practice
}

interface InterviewPrepSection {
    id?: string;
    roleTitle?: string;
    targetRole?: string;
    companyName?: string;
    generatedAt: string;
    questions: InterviewQuestion[];
    lastUpdatedAt?: string;
}
