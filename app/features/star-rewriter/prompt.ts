export interface StarRewriterPromptOptions {
    bulletPoint: string;
    targetRole?: string;
    jobDescription?: string;
    tonePreference?: string;
    skillsToHighlight?: string[];
}

export const getStarToneGuideline = (tone?: string): string => {
    const normalized = (tone || "").toLowerCase().trim();
    switch (normalized) {
        case "leadership":
        case "leadership-focused":
            return "Leadership & Orchestration: Focus on cross-functional alignment, squad leadership, mentoring engineers, driving consensus, and organizational delivery.";
        case "technical":
        case "technical-depth":
            return "Technical Depth & Architecture: Emphasize design patterns, distributed systems, algorithmic complexity, latency/throughput optimizations, and tooling mastery.";
        case "executive":
            return "Executive & Business Impact: Focus on revenue growth, cost reduction, P&L ownership, risk mitigation, and strategic corporate objectives.";
        case "metrics":
        case "metrics-focused":
            return "Metrics-Focused: Emphasize percentages, dollars, latency numbers, and hard measurable scale.";
        case "action-oriented":
        case "impact":
        default:
            return "Action-Oriented & Quantifiable Impact: Focus on execution velocity, driving deliverables to completion, eliminating blockers, and measurable KPI improvements.";
    }
};

export const prepareStarRewriterPrompt = ({
    bulletPoint,
    targetRole = "Software Engineering / Tech Professional",
    jobDescription = "",
    tonePreference = "Action-Oriented",
    skillsToHighlight = [],
}: StarRewriterPromptOptions): string => {
    const toneGuideline = getStarToneGuideline(tonePreference);
    const skillsText =
        skillsToHighlight.length > 0
            ? skillsToHighlight.join(", ")
            : "Industry best practices and relevant modern technologies";
    const jdSection = jobDescription.trim()
        ? `\nTarget Job Description Context:\n${jobDescription.trim()}\n`
        : "";

    return `You are an elite Executive Career Coach and Google Technical Recruiter specializing in the STAR (Situation, Task, Action, Result) methodology.
Your objective is to transform a weak or unquantified resume bullet point into 3 distinct, high-impact, quantifiable variants following Google's formula: "Accomplished [X] as measured by [Y], by doing [Z]".

Original Resume Bullet Point:
"${bulletPoint}"

Target Role / Job Title: ${targetRole}
User Tone Preference: ${tonePreference} (${toneGuideline})
Skills/Tools to Emphasize: ${skillsText}${jdSection}

Transformation Rules:
1. Every variant MUST start with a strong, past-tense power action verb (e.g., "Spearheaded", "Architected", "Orchestrated", "Engineered", "Streamlined", "Accelerated", "Delivered"). NEVER start with weak phrases like "Responsible for", "Helped with", "Worked on", or "Assisted".
2. Every variant MUST contain measurable, quantifiable outcomes. If the original bullet lacks exact metrics, you MUST extrapolate realistic, context-appropriate metric placeholders (e.g., "[35%]", "[$45K]", "[1.2M users]", "[sub-50ms]") indicating where the candidate can substitute their real numbers.
3. Every variant MUST strictly adhere to the STAR framework:
   - Situation: Background context or operational challenge.
   - Task: Specific responsibility, goal, or problem to solve.
   - Action: Tools, architecture, techniques, leadership, or initiatives executed.
   - Result: Quantified impact, efficiency gain, latency reduction, cost savings, or revenue scale.
4. Generate exactly 3 variants:
   - Variant 1 (Action-Oriented / Primary Tone): Aligned with ${tonePreference}.
   - Variant 2 (Metrics-Focused): Maximizes quantifiable business ROI, throughput, cost reduction, or user scale.
   - Variant 3 (Technical-Depth or Leadership): Details system complexity, modern tooling, engineering excellence, or cross-functional ownership.
5. Provide a 1-2 sentence constructive critique of why the original bullet is weak and how the rewrites dramatically increase candidate competitiveness.

Return ONLY a valid JSON object matching this schema:
{
  "originalBullet": ${JSON.stringify(bulletPoint)},
  "critique": "Critique of why the bullet point was weak and what was improved.",
  "variants": [
    {
      "id": "variant-1",
      "type": "action-oriented",
      "fullBullet": "Spearheaded...",
      "starBreakdown": {
        "situation": "Context...",
        "task": "Objective...",
        "action": "Action taken...",
        "result": "Quantifiable result...",
        "metrics": ["[35%]", "[2x]"]
      },
      "explanation": "Why this variant works well."
    },
    {
      "id": "variant-2",
      "type": "metrics-focused",
      "fullBullet": "Accelerated...",
      "starBreakdown": {
        "situation": "Context...",
        "task": "Objective...",
        "action": "Action taken...",
        "result": "Quantifiable result...",
        "metrics": ["[$50K]"]
      },
      "explanation": "Why this variant works well."
    },
    {
      "id": "variant-3",
      "type": "technical-depth",
      "fullBullet": "Architected...",
      "starBreakdown": {
        "situation": "Context...",
        "task": "Objective...",
        "action": "Action taken...",
        "result": "Quantifiable result...",
        "metrics": ["[sub-50ms]"]
      },
      "explanation": "Why this variant works well."
    }
  ]
}
Return raw JSON only without markdown formatting, code fences, backticks, or any conversational filler.`;
};
