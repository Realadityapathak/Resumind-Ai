export interface CoverLetterPromptOptions {
    resumeText: string;
    jobTitle?: string;
    companyName?: string;
    jobDescription?: string;
    tone?: CoverLetterTone;
    userProfile?: Partial<UserProfile>;
    customNotes?: string;
}

export const getCoverLetterToneGuideline = (tone?: CoverLetterTone): string => {
    switch (tone) {
        case "passionate":
            return "Passionate & Mission-Driven: Express high energy, authentic excitement for the company's product vision and culture, and meaningful connection between personal purpose and company mission.";
        case "executive":
            return "Executive & Strategic: Adopt a macro-level business perspective, focusing on ROI, leadership presence, organizational transformation, stakeholder alignment, and enterprise scale.";
        case "conversational":
            return "Conversational & Personable: Warm, direct, authentic human voice, modern tech team culture, engaging storytelling, and enthusiastic collegiality while preserving technical credibility.";
        case "professional":
        default:
            return "Professional & Polished: Clear, structured, authoritative business communication, active voice, objective presentation of accomplishments, and respectful confidence.";
    }
};

export const prepareCoverLetterPrompt = ({
    resumeText,
    jobTitle = "Software Engineering Professional",
    companyName = "Target Company",
    jobDescription = "",
    tone = "professional",
    userProfile,
    customNotes = "",
}: CoverLetterPromptOptions): string => {
    const toneGuideline = getCoverLetterToneGuideline(tone);
    const candidateName = userProfile?.displayName || userProfile?.username || "[Candidate Name]";
    const experienceContext = userProfile?.experienceLevel
        ? `Candidate Target Experience Level: ${userProfile.experienceLevel}`
        : "";

    const jdSection = jobDescription.trim()
        ? `\nTarget Job Description:\n${jobDescription.trim()}\n`
        : "\nTarget Job Description: Not provided. Ground the letter in standard industry requirements for this title.\n";

    const notesSection = customNotes.trim()
        ? `\nCandidate Specific Instructions / Focus Areas:\n${customNotes.trim()}\n`
        : "";

    return `You are an elite Executive Career Strategist and Principal Recruiter.
Your objective is to generate a tailored, persuasive, and grounded cover letter bridging the candidate's authentic resume experience with the target role and company.

Candidate Full Name: ${candidateName}
Target Company Name: ${companyName}
Target Job Title: ${jobTitle}
${experienceContext}
Selected Tone: ${tone} (${toneGuideline})
${jdSection}${notesSection}
Candidate Verified Resume Text:
${resumeText}

Strict Generation Rules:
1. Grounding & Anti-Hallucination: Every achievement, metric, tool, or technical skill mentioned in the cover letter MUST be directly substantiated by the Candidate Verified Resume Text. NEVER invent employers, educational degrees, or metrics not present in the resume.
2. Tone Adherence: Strictly maintain the requested "${tone}" tone throughout the entire letter.
3. Structural Composition:
   - "subjectLine": Crisp, standard format: "Application for ${jobTitle} — ${candidateName}".
   - "salutation": Professional greeting: "Dear Hiring Team at ${companyName}," or "Dear [Hiring Manager],".
   - "hookParagraph": High-impact opening stating specific interest in ${companyName} and ${jobTitle}, articulating the candidate's unique core value proposition.
   - "bodyParagraphs": Exactly 2 to 3 paragraphs:
     * Paragraph 1: Direct technical/domain alignment — cites 1-2 verifiable accomplishments from the resume with quantified outcomes (%, $, scale, latency) directly answering the job requirements.
     * Paragraph 2: Execution, problem-solving, and cross-functional leadership — highlights engineering methodology, architecture, teamwork, or squad ownership.
     * Paragraph 3 (optional/recommended): Culture alignment, domain passion, or specific relevance to the company's product roadmap.
   - "closingParagraph": Confident call to action expressing enthusiasm to discuss contributions in an interview.
   - "signOff": Standard formal closing (e.g., "Sincerely," or "Warm regards,") followed on a new line by "${candidateName}".
   - "fullText": The complete, beautifully assembled cover letter with all sections separated by double newlines (\n\n), ready for copy, download, or printing.

Return ONLY a valid JSON object matching this schema:
{
  "roleTitle": ${JSON.stringify(jobTitle)},
  "companyName": ${JSON.stringify(companyName)},
  "tone": "${tone}",
  "subjectLine": ${JSON.stringify(`Application for ${jobTitle} — ${candidateName}`)},
  "salutation": ${JSON.stringify(`Dear Hiring Team at ${companyName},`)},
  "hookParagraph": "Opening hook...",
  "bodyParagraphs": [
    "First achievement paragraph citing resume metrics...",
    "Second leadership/methodology paragraph..."
  ],
  "closingParagraph": "Call to action paragraph...",
  "signOff": "Sincerely,\\n${candidateName}",
  "fullText": "Full formatted cover letter text..."
}
Return raw JSON only without markdown formatting, code fences, backticks, or any conversational filler.`;
};
