export interface KeywordGapPromptOptions {
    resumeText: string;
    jobTitle?: string;
    jobDescription: string;
}

export const prepareKeywordGapPrompt = ({
    resumeText,
    jobTitle = "Target Role",
    jobDescription,
}: KeywordGapPromptOptions): string => {
    return `You are an elite Applicant Tracking System (ATS) Algorithm Architect and Principal Technical Recruiter.
Your objective is to conduct a semantic keyword gap analysis between a candidate's resume and a target job description.

Target Job Title: ${jobTitle}

Target Job Description:
${jobDescription}

Candidate Resume Text:
${resumeText}

Analysis Instructions:
1. Extract 15-25 of the most critical hard skills, technical tools, frameworks, programming languages, domain methodologies, and essential soft skills specified or implied in the Target Job Description.
2. For each extracted keyword/skill:
   - Count its frequency of occurrence in the Job Description.
   - Scan the Candidate Resume Text for exact or semantically equivalent mentions (e.g., "Postgres" matches "PostgreSQL", "ReactJS" matches "React").
   - Count its frequency of occurrence in the Resume (0 if missing).
   - Classify into category: "technical" | "soft" | "domain" | "tools".
   - Assign importance level:
     * "critical": Must-have requirement explicitly stated as required or repeated multiple times in the JD.
     * "recommended": Preferred qualification or strongly associated skill.
     * "optional": Nice-to-have or peripheral skill.
3. Separate into two lists:
   - "matchedKeywords": Keywords that are present in the resume. Provide a brief context indicating where or how they are matched.
   - "missingKeywords": Critical or recommended keywords that are absent or insufficiently emphasized in the resume. For each missing keyword, provide a concrete, actionable "contextOrSuggestion" explaining exactly where in the resume (e.g. "Skills section", "Projects", "Work Experience bullet under Role X") the candidate should incorporate it, along with a suggested phrasing example.
4. Calculate "matchRate":
   - Formula: Round to nearest whole integer: (matchedCount / totalJobKeywords) * 100.
5. Provide 3-4 high-impact "topRecommendations" prioritized by ATS weight.

Return ONLY a valid JSON object matching this schema:
{
  "matchRate": number,
  "totalJobKeywords": number,
  "matchedCount": number,
  "missingCount": number,
  "matchedKeywords": [
    {
      "keyword": string,
      "category": "technical" | "soft" | "domain" | "tools",
      "frequencyInJob": number,
      "frequencyInResume": number,
      "importance": "critical" | "recommended" | "optional",
      "contextOrSuggestion": string
    }
  ],
  "missingKeywords": [
    {
      "keyword": string,
      "category": "technical" | "soft" | "domain" | "tools",
      "frequencyInJob": number,
      "frequencyInResume": 0,
      "importance": "critical" | "recommended" | "optional",
      "contextOrSuggestion": string
    }
  ],
  "topRecommendations": [
    string
  ]
}
Return raw JSON only without markdown formatting, code fences, backticks, or any conversational filler.`;
};
