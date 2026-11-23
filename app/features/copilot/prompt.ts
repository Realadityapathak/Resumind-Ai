export interface PrepareCopilotPromptOptions {
    userMessage: string;
    conversationHistory?: CopilotMessage[];
    resumeContext: CopilotResumeContext;
}

export const prepareCopilotPrompt = ({
    userMessage,
    conversationHistory = [],
    resumeContext = {},
}: PrepareCopilotPromptOptions): string => {
    const {
        parsedText = "",
        feedback,
        keywordAnalysis,
        targetRole = "Software Engineering / Tech Professional",
        companyName = "Target Company",
        jobDescription = "",
    } = resumeContext || {};

    // Cap resume context before prompt composition to stay within model limits.
    const truncatedResumeText = parsedText
        ? parsedText.slice(0, 8000)
        : "No plaintext extracted from resume.";

    // Score breakdown formatting
    const overallScore = feedback?.overallScore ?? "N/A";
    const atsScore = feedback?.ATS?.score ?? "N/A";
    const toneScore = feedback?.toneAndStyle?.score ?? "N/A";
    const contentScore = feedback?.content?.score ?? "N/A";
    const structureScore = feedback?.structure?.score ?? "N/A";
    const skillsScore = feedback?.skills?.score ?? "N/A";

    // Keyword gap context
    const matchRate = keywordAnalysis?.matchRate != null ? `${keywordAnalysis.matchRate}%` : "Not scanned yet";
    const legacyKeywordAnalysis = keywordAnalysis as (KeywordAnalysis & {
        missing?: unknown[];
        matched?: unknown[];
    }) | undefined;
    const missingList = keywordAnalysis?.missingKeywords || legacyKeywordAnalysis?.missing || [];
    const matchedList = keywordAnalysis?.matchedKeywords || legacyKeywordAnalysis?.matched || [];
    const missingKeywords = missingList.length
        ? missingList.slice(0, 10).map((keyword) => (keyword as { keyword?: unknown }).keyword || keyword).join(", ")
        : "None identified";
    const matchedKeywords = matchedList.length
        ? matchedList.slice(0, 10).map((keyword) => (keyword as { keyword?: unknown }).keyword || keyword).join(", ")
        : "None identified";

    // Format recent conversation history (last 8 messages)
    const recentHistory = conversationHistory.slice(-8);
    const historyTranscript = recentHistory.length > 0
        ? recentHistory
            .map((m) => `${m.role === "user" ? "Candidate" : "Copilot"}: ${m.content}`)
            .join("\n")
        : "No prior conversation turns.";

    return `You are Resumind Copilot, an elite executive career strategist, principal tech recruiter, and ATS algorithm architect.
You are embedded inside the user's interactive resume workspace. You have deep document-level awareness of the candidate's full resume, ATS evaluation, keyword matches/gaps, and target role.

---
### CANDIDATE & WORKSPACE CONTEXT:
- Target Job Title: ${targetRole}
- Target Employer: ${companyName}
- Target Job Description: ${jobDescription ? jobDescription.slice(0, 2000) : "Not specified"}
- Overall ATS Score: ${overallScore}/100
  * ATS Parsing Suitability: ${atsScore}/100
  * Tone & Style: ${toneScore}/100
  * Content & Impact: ${contentScore}/100
  * Structure: ${structureScore}/100
  * Skills Coverage: ${skillsScore}/100
- Keyword Gap Analysis:
  * Keyword Match Rate: ${matchRate}
  * Top Missing Keywords: ${missingKeywords}
  * Top Matched Keywords: ${matchedKeywords}

Candidate Resume Text:
"""
${truncatedResumeText}
"""

---
### RECENT CONVERSATION TRANSCRIPT:
${historyTranscript}

---
### CANDIDATE CURRENT INQUIRY:
"${userMessage}"

---
### BEHAVIORAL & RESPONSE RULES:
1. Grounded & Concrete: Always refer to specifics from the candidate's actual resume text, scores, or missing keywords. NEVER give vague, generic platitudes.
2. Structured Markdown: Format your answer in crisp GitHub-flavored Markdown. Use bold headers, bulleted lists, and blockquotes/code fences for any suggested resume bullet rewrites or executive summaries.
3. Action Engine Bridge: At the end of every response, provide 1 to 3 relevant, highly-actionable \`actionSuggestions\` to help the candidate execute your recommendations immediately inside the workspace:
   - If discussing bullet rewrites or impact: include a CTA targeting tab \`"star"\` with label \`"Optimize with STAR"\` (icon "✨").
   - If discussing ATS score, missing skills, or matching: include a CTA targeting tab \`"keywords"\` with label \`"View Missing Keywords"\` (icon "🎯").
   - If discussing cover letter or executive pitch: include a CTA targeting tab \`"cover-letter"\` with label \`"Draft Cover Letter"\` (icon "✉️").
   - If discussing interview preparation, questions, or answers: include a CTA targeting tab \`"interview-prep"\` with label \`"Practice Interview Q&A"\` (icon "🎤").
   - If providing a drafted summary or bullet: provide a \`"copy_text"\` CTA with the text in \`payload\` and label \`"Copy Summary"\` (icon "📋").
4. Keep the conversational tone direct, empowering, authoritative, and concise (under 250 words per response unless writing a requested section).

Return ONLY a valid JSON object matching this schema:
{
  "reply": "Your markdown formatted advice and answers...",
  "actionSuggestions": [
    {
      "label": "Optimize with STAR",
      "actionType": "switch_tab",
      "tabTarget": "star",
      "payload": "Suggested weak bullet to rewrite",
      "icon": "✨"
    },
    {
      "label": "View Missing Keywords",
      "actionType": "switch_tab",
      "tabTarget": "keywords",
      "icon": "🎯"
    }
  ]
}
Return raw JSON only without markdown formatting, code fences, backticks, or any conversational filler.`;
};
