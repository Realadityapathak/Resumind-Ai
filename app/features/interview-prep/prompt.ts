export interface InterviewPrepPromptOptions {
    resumeText: string;
    jobTitle?: string;
    companyName?: string;
    jobDescription?: string;
    weaknesses?: string[];
    atsScore?: number;
}

export const prepareInterviewPrepPrompt = ({
    resumeText,
    jobTitle = "Software Engineering / Tech Professional",
    companyName = "Target Company",
    jobDescription = "",
    weaknesses = [],
    atsScore = 75,
}: InterviewPrepPromptOptions): string => {
    const jdSection = jobDescription.trim()
        ? `\nTarget Job Description:\n${jobDescription.trim()}\n`
        : "\nTarget Job Description: Not provided — evaluate against top-tier industry standards for this job title.\n";

    const weaknessesSection =
        weaknesses.length > 0
            ? `\nIdentified Improvement Areas & ATS Audit Weaknesses:\n${weaknesses.map((w) => `- ${w}`).join("\n")}\n`
            : "\nIdentified Improvement Areas & ATS Audit Weaknesses: None explicitly listed — probe standard competencies for this level.\n";

    return `You are a Principal Hiring Manager, Technical Recruiter, and Bar Raiser for ${jobTitle} at ${companyName}.
Your objective is to generate 6 to 8 rigorous, highly realistic, role-tailored interview questions directly anchored to the candidate's resume, target job requirements, and ATS weaknesses.

Candidate Context:
- Target Job Title: ${jobTitle}
- Target Company: ${companyName}
- Candidate ATS Score: ${atsScore}/100${jdSection}${weaknessesSection}
Candidate Resume Text:
${resumeText.slice(0, 12000)}

Question Generation Guidelines:
1. Generate between 6 and 8 questions distributed across 3 distinct categories:
   - "behavioral": 2 to 3 questions exploring conflict resolution, ownership, trade-off negotiation, mentorship, cross-functional delivery, and learning from failure.
   - "technical": 2 to 3 questions exploring system architecture, scalability, algorithmic/code design, database modeling, testing paradigms, or modern framework internals relevant to the candidate's stated stack.
   - "situational": 2 questions exploring realistic high-pressure scenarios (e.g. production incident mitigation, navigating changing product roadmaps, dealing with ambiguous technical requirements).
2. For EVERY question, you MUST provide:
   - id: Unique string identifier (e.g., "q-1", "q-2", ...).
   - category: Exactly one of "behavioral", "technical", or "situational".
   - question: The exact phrasing of the interview question as spoken by an experienced interviewer.
   - recruiterIntent: A 1-2 sentence explanation of what the interviewer is evaluating (underlying signals, soft skills, technical depth, or red flag detection).
   - resumeAnchor: The specific experience, project, skill, metric, or identified ATS weakness from the candidate's background that prompts this question.
   - starModelAnswer: A structured high-scoring candidate response:
     * situation: Background context and business challenge.
     * task: Clear objective or technical dilemma.
     * action: Specific engineering or leadership steps executed.
     * result: Measurable business impact, efficiency gain, latency improvement, or learning.
     * fullAnswer: A cohesive 3-4 sentence first-person response combining the STAR points so the candidate can practice it directly.
   - pitfallsToAvoid: Exactly 2 to 3 concrete candidate mistakes, anti-patterns, or things NOT to say.

Return ONLY a valid JSON object matching this schema:
{
  "roleTitle": ${JSON.stringify(jobTitle)},
  "companyName": ${JSON.stringify(companyName)},
  "questions": [
    {
      "id": "q-1",
      "category": "behavioral",
      "question": "Tell me about a time you had to balance technical debt with urgent feature deadlines.",
      "recruiterIntent": "Evaluates pragmatic engineering judgment, prioritization under pressure, and communication with product managers.",
      "resumeAnchor": "Anchored to your experience modernizing legacy services at your previous role.",
      "starModelAnswer": {
        "situation": "Our team faced a critical product release while our legacy database layer was encountering connection timeouts.",
        "task": "Deliver the feature on time without causing database cascading failures.",
        "action": "I implemented connection pooling and read-replica routing as a stopgap, negotiated a 2-week technical sprint post-launch, and instrumented p99 latency alarms.",
        "result": "Launched the feature on schedule with zero downtime, and subsequently reduced p99 latency by 45%.",
        "fullAnswer": "At my previous company, we were facing a hard release deadline when our legacy database started dropping connections under load. Rather than doing a risky full refactor during a freeze, I introduced connection pooling and read replicas as an immediate buffer, while securing commitment from the product team for a dedicated tech debt sprint right after. We launched on time with zero downtime and improved p99 latency by 45% once the full migration finished."
      },
      "pitfallsToAvoid": [
        "Blaming the product team for demanding unreasonable deadlines.",
        "Refusing to compromise and letting the release slip without proposing mitigation.",
        "Failing to track or quantify the subsequent tech debt resolution."
      ]
    }
  ]
}
Return raw JSON only without markdown formatting, code fences, backticks, or any conversational filler.`;
};
