import { prepareCoverLetterPrompt, type CoverLetterPromptOptions } from "./prompt";
import { cleanJson, safeJsonParse } from "~/utils/json";
import { generateUUID } from "~/utils/uuid";

interface CoverLetterResponseSchema {
    roleTitle?: string;
    companyName?: string;
    tone?: CoverLetterTone;
    subjectLine: string;
    salutation: string;
    hookParagraph: string;
    bodyParagraphs: string[];
    closingParagraph: string;
    signOff: string;
    fullText?: string;
}

interface CoverLetterAiResponse {
    message?: {
        content: string | { text?: string }[];
    };
}

type CoverLetterAiChat = (
    prompt: { role: "user"; content: string }[],
    options?: { model: string }
) => Promise<CoverLetterAiResponse | null | undefined>;

export function validateCoverLetterResponse(data: unknown): data is CoverLetterResponseSchema {
    if (!data || typeof data !== "object") return false;
    const candidate = data as Record<string, unknown>;
    if (typeof candidate.subjectLine !== "string" || !candidate.subjectLine.trim()) return false;
    if (typeof candidate.salutation !== "string" || !candidate.salutation.trim()) return false;
    if (typeof candidate.hookParagraph !== "string" || !candidate.hookParagraph.trim()) return false;
    if (!Array.isArray(candidate.bodyParagraphs) || candidate.bodyParagraphs.length === 0) return false;
    if (candidate.bodyParagraphs.some((paragraph: unknown) => typeof paragraph !== "string" || !paragraph.trim())) return false;
    if (typeof candidate.closingParagraph !== "string" || !candidate.closingParagraph.trim()) return false;
    if (typeof candidate.signOff !== "string" || !candidate.signOff.trim()) return false;
    return true;
}

export function calculateWordCount(text: string): number {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
}

export function calculateReadingTimeMinutes(wordCount: number): number {
    if (wordCount <= 0) return 0;
    // Standard silent reading rate: ~200 words per minute
    return Math.max(1, Math.ceil(wordCount / 200));
}

export function assembleFullCoverLetterText(parts: {
    subjectLine: string;
    salutation: string;
    hookParagraph: string;
    bodyParagraphs: string[];
    closingParagraph: string;
    signOff: string;
}): string {
    const paragraphs = [
        parts.subjectLine,
        parts.salutation,
        parts.hookParagraph,
        ...parts.bodyParagraphs,
        parts.closingParagraph,
        parts.signOff,
    ];
    return paragraphs.join("\n\n");
}

export async function generateCoverLetter(
    puterAiChat: CoverLetterAiChat,
    options: CoverLetterPromptOptions
): Promise<CoverLetter> {
    const resumeText = options.resumeText?.trim() || "";
    if (resumeText.length < 20) {
        throw new Error("Resume content is too short or missing. Please ensure your resume text is loaded.");
    }

    const prompt = prepareCoverLetterPrompt(options);

    const response = await puterAiChat(
        [
            {
                role: "user",
                content: prompt,
            },
        ],
        { model: "google/gemini-2.5-flash" }
    );

    if (!response || !response.message) {
        throw new Error("Puter AI returned an empty or invalid response.");
    }

    const rawText =
        typeof response.message.content === "string"
            ? response.message.content
            : response.message.content[0]?.text || "";

    const cleaned = cleanJson(rawText);
    const parsed = safeJsonParse<unknown>(cleaned, null);

    if (!parsed || !validateCoverLetterResponse(parsed)) {
        throw new Error("Failed to parse structured cover letter from AI response.");
    }

    const bodyParagraphs = parsed.bodyParagraphs.map((paragraph) => paragraph.trim());
    const fullText =
        parsed.fullText && parsed.fullText.trim().length > 50
            ? parsed.fullText.trim()
            : assembleFullCoverLetterText({
                  subjectLine: parsed.subjectLine.trim(),
                  salutation: parsed.salutation.trim(),
                  hookParagraph: parsed.hookParagraph.trim(),
                  bodyParagraphs,
                  closingParagraph: parsed.closingParagraph.trim(),
                  signOff: parsed.signOff.trim(),
              });

    const words = calculateWordCount(fullText);
    const readingTime = calculateReadingTimeMinutes(words);

    return {
        id: generateUUID(),
        roleTitle: options.jobTitle || parsed.roleTitle || "Target Role",
        jobTitle: options.jobTitle || parsed.roleTitle || "Target Role",
        companyName: options.companyName || parsed.companyName || "Target Company",
        tone: options.tone || parsed.tone || "professional",
        subjectLine: parsed.subjectLine.trim(),
        salutation: parsed.salutation.trim(),
        hookParagraph: parsed.hookParagraph.trim(),
        bodyParagraphs,
        closingParagraph: parsed.closingParagraph.trim(),
        signOff: parsed.signOff.trim(),
        fullText,
        wordCount: words,
        readingTimeMinutes: readingTime,
        createdAt: new Date().toISOString(),
    };
}
