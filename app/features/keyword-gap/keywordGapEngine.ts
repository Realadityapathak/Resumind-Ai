import { prepareKeywordGapPrompt, type KeywordGapPromptOptions } from "./prompt";
import { cleanJson, safeJsonParse } from "~/utils/json";

interface KeywordGapAiResponse {
    message?: {
        content: string | { text?: string }[];
    };
}

type KeywordGapAiChat = (
    prompt: { role: "user"; content: string }[],
    options?: { model: string }
) => Promise<KeywordGapAiResponse | null | undefined>;

interface KeywordItemCandidate {
    keyword?: unknown;
    category?: unknown;
    frequencyInJob?: unknown;
    frequencyInResume?: unknown;
    importance?: unknown;
    contextOrSuggestion?: unknown;
}

interface KeywordGapResponseSchema {
    matchRate?: unknown;
    totalJobKeywords?: unknown;
    matchedKeywords: unknown[];
    missingKeywords: unknown[];
    topRecommendations?: unknown;
}

export function validateKeywordGapAnalysis(data: unknown): data is KeywordGapResponseSchema {
    if (!data || typeof data !== "object") return false;
    const candidate = data as Partial<KeywordGapResponseSchema>;
    if (typeof candidate.matchRate !== "number" && typeof candidate.totalJobKeywords !== "number") return false;
    if (!Array.isArray(candidate.matchedKeywords) || !Array.isArray(candidate.missingKeywords)) return false;
    return true;
}

export async function executeKeywordGapAnalysis(
    puterAiChat: KeywordGapAiChat,
    options: KeywordGapPromptOptions
): Promise<KeywordAnalysis> {
    const jd = options.jobDescription?.trim() || "";
    if (jd.length < 20) {
        throw new Error(
            "Job description is too short to perform keyword gap analysis. Please provide at least 20 characters."
        );
    }

    const prompt = prepareKeywordGapPrompt(options);

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

    if (!parsed || !validateKeywordGapAnalysis(parsed)) {
        throw new Error("Failed to parse valid ATS keyword gap analysis from AI response.");
    }

    const matchedKeywords: KeywordItem[] = parsed.matchedKeywords
        .filter((value): value is object => Boolean(value && typeof value === "object"))
        .map((value) => {
            const item = value as KeywordItemCandidate;
            return {
                keyword: String(item.keyword || "").trim(),
                category: (item.category as KeywordCategory) || "technical",
                frequencyInJob: Number(item.frequencyInJob) || 1,
                frequencyInResume: Number(item.frequencyInResume) || 1,
                importance: (item.importance as KeywordImportance) || "recommended",
                contextOrSuggestion: (item.contextOrSuggestion as string) || "",
            };
        });

    const missingKeywords: KeywordItem[] = parsed.missingKeywords
        .filter((value): value is object => Boolean(value && typeof value === "object"))
        .map((value) => {
            const item = value as KeywordItemCandidate;
            return {
                keyword: String(item.keyword || "").trim(),
                category: (item.category as KeywordCategory) || "technical",
                frequencyInJob: Number(item.frequencyInJob) || 1,
                frequencyInResume: 0,
                importance: (item.importance as KeywordImportance) || "critical",
                contextOrSuggestion: (item.contextOrSuggestion as string) || "",
            };
        });

    const calculatedTotal = matchedKeywords.length + missingKeywords.length;
    const matchRate =
        calculatedTotal > 0
            ? Math.max(0, Math.min(100, Math.round((matchedKeywords.length / calculatedTotal) * 100)))
            : Number(parsed.matchRate) || 0;

    return {
        matchRate,
        totalJobKeywords: (parsed.totalJobKeywords as number) || calculatedTotal,
        matchedCount: matchedKeywords.length,
        missingCount: missingKeywords.length,
        matchedKeywords,
        missingKeywords,
        topRecommendations: Array.isArray(parsed.topRecommendations)
            ? (parsed.topRecommendations as string[])
            : [],
        analyzedAt: new Date().toISOString(),
        targetJobTitle: options.jobTitle,
    };
}
