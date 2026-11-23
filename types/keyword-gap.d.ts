// ==========================================
// KEYWORD GAP ANALYSIS TYPES
// ==========================================

type KeywordCategory = "technical" | "soft" | "domain" | "tools";
type KeywordImportance = "critical" | "recommended" | "optional";

interface KeywordItem {
    keyword: string;
    category: KeywordCategory;
    frequencyInJob: number;
    frequencyInResume: number;
    importance: KeywordImportance;
    contextOrSuggestion?: string;
}

interface KeywordAnalysis {
    matchRate: number; // 0-100 percentage
    totalJobKeywords: number;
    matchedCount: number;
    missingCount: number;
    matchedKeywords: KeywordItem[];
    missingKeywords: KeywordItem[];
    topRecommendations?: string[];
    analyzedAt?: string;
    targetJobTitle?: string;
}
