const COMMON_STOP_WORDS = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "can", "did", "do", "does", "doing", "don", "down", "during", "each", "few", "for",
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
    "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she",
    "should", "so", "some", "such", "t", "than", "that", "the", "their", "theirs", "them",
    "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too",
    "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which", "while",
    "who", "whom", "why", "will", "with", "you", "your", "yours", "yourself", "yourselves",
    "responsible", "experience", "years", "work", "role", "team", "candidates", "looking", "must"
]);

export function tokenizeAndMatchKeywords(
    resumeText: string,
    jobDescription: string
): KeywordAnalysis {
    if (!jobDescription || !jobDescription.trim()) {
        return {
            matchRate: 0,
            totalJobKeywords: 0,
            matchedCount: 0,
            missingCount: 0,
            matchedKeywords: [],
            missingKeywords: [],
            topRecommendations: ["Add a target job description to run ATS keyword gap comparison."],
            analyzedAt: new Date().toISOString(),
        };
    }

    const normalizedResume = (resumeText || "").toLowerCase();
    const rawWords = jobDescription
        .toLowerCase()
        .replace(/[^a-zA-Z0-9+#.-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !COMMON_STOP_WORDS.has(w));

    const wordFrequency = new Map<string, number>();
    for (const word of rawWords) {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    }

    // Bound fallback output to the 20 most frequent terms so analysis and rendering stay predictable.
    const sortedKeywords = Array.from(wordFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

    const matchedKeywords: KeywordItem[] = [];
    const missingKeywords: KeywordItem[] = [];

    for (const [kw, freq] of sortedKeywords) {
        const isMatched = normalizedResume.includes(kw);
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, "g");
        const resumeCount = (normalizedResume.match(regex) || []).length;
        const importance: KeywordImportance = freq >= 4 ? "critical" : freq >= 2 ? "recommended" : "optional";
        const formattedKw = kw.charAt(0).toUpperCase() + kw.slice(1);

        if (isMatched && resumeCount > 0) {
            matchedKeywords.push({
                keyword: formattedKw,
                category: "technical",
                frequencyInJob: freq,
                frequencyInResume: resumeCount,
                importance,
                contextOrSuggestion: `Mentioned ${resumeCount} time(s) in resume text.`,
            });
        } else {
            missingKeywords.push({
                keyword: formattedKw,
                category: "technical",
                frequencyInJob: freq,
                frequencyInResume: 0,
                importance,
                contextOrSuggestion: `Appeared ${freq} time(s) in target job description. Recommend adding to Skills or Work Experience.`,
            });
        }
    }

    const total = matchedKeywords.length + missingKeywords.length;
    const matchRate = total > 0 ? Math.round((matchedKeywords.length / total) * 100) : 0;

    return {
        matchRate,
        totalJobKeywords: total,
        matchedCount: matchedKeywords.length,
        missingCount: missingKeywords.length,
        matchedKeywords,
        missingKeywords,
        topRecommendations: [
            missingKeywords[0]
                ? `Incorporate top missing keyword "${missingKeywords[0].keyword}" into your skills summary.`
                : "Great match! Keep technical keywords prominently featured.",
            "Align action verbs in bullet points with key phrases from the job description.",
        ],
        analyzedAt: new Date().toISOString(),
    };
}
