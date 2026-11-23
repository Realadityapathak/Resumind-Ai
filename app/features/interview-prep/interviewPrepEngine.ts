import { prepareInterviewPrepPrompt, type InterviewPrepPromptOptions } from "./prompt";
import { cleanJson, safeJsonParse } from "~/utils/json";
import { generateUUID } from "~/utils/uuid";

interface InterviewPrepAiResponse {
    message?: {
        content: string | { text?: string }[];
    };
}

type InterviewPrepAiChat = (
    prompt: { role: "user"; content: string }[],
    options?: { model: string }
) => Promise<InterviewPrepAiResponse | null | undefined>;

type UnknownRecord = Record<string, unknown>;

interface InterviewQuestionsPayload {
    questions: UnknownRecord[];
}

export function validateInterviewQuestions(data: unknown): data is InterviewQuestionsPayload {
    if (!data || typeof data !== "object") return false;
    const candidate = data as { questions?: unknown };
    if (!Array.isArray(candidate.questions) || candidate.questions.length === 0) return false;
    return candidate.questions.every(
        (value: unknown) => {
            const q = value as UnknownRecord | null;
            return (
                typeof q === "object" &&
                q !== null &&
                typeof q.question === "string" &&
                q.question.trim().length > 0 &&
                (typeof q.recruiterIntent === "string" || typeof q.interviewerIntent === "string") &&
                typeof q.starModelAnswer === "object" &&
                q.starModelAnswer !== null
            );
        }
    );
}

function buildStarGuidance(focus: string): InterviewQuestion["starModelAnswer"] {
    return {
        situation: `Choose a real ${focus} example from your own experience. Describe the team, the goal, and the constraints that made it challenging.`,
        task: "State your specific responsibility, what success required, and the deadline or trade-offs you faced.",
        action: "Describe the concrete actions you personally took, the alternatives you weighed, and why you chose them.",
        result: "Report only outcomes you can verify, using metrics from your own records where available.",
        fullAnswer: `Use your own ${focus} experience to draft this answer: set the situation, your task, the actions you took, and the verified result. Do not borrow examples or outcomes that did not happen.`,
    };
}

export function getDefaultInterviewQuestions(
    jobTitle: string = "Software Engineer",
    companyName: string = "Target Company"
): InterviewQuestion[] {
    return [
        {
            id: "fallback-q1",
            category: "behavioral",
            question: "Tell me about a time you led a technically challenging project under aggressive deadlines.",
            recruiterIntent: "Assesses leadership maturity, influence without authority, stakeholder communication, and delivery under pressure.",
            resumeAnchor: `Anchored to your engineering experience applying for ${jobTitle} at ${companyName}.`,
            starModelAnswer: buildStarGuidance("leadership and delivery"),
            pitfallsToAvoid: [
                "Focusing only on personal coding without mentioning team collaboration.",
                "Omitting measurable business outcomes or metrics.",
                "Speaking in vague generalities rather than a concrete project.",
            ],
            isBookmarked: false,
            userPracticeResponse: "",
        },
        {
            id: "fallback-q2",
            category: "technical",
            question: "How do you identify, profile, and resolve latency or performance bottlenecks in your applications?",
            recruiterIntent: "Probes in-depth understanding of telemetry, profiling tools, caching strategies, and systematic debugging.",
            resumeAnchor: `Anchored to your technical skills and performance optimization experience for ${jobTitle}.`,
            starModelAnswer: buildStarGuidance("performance debugging"),
            pitfallsToAvoid: [
                "Guessing solutions without explaining how you measured and profiled the issue.",
                "Failing to mention trade-offs of caching (e.g., cache invalidation).",
            ],
            isBookmarked: false,
            userPracticeResponse: "",
        },
        {
            id: "fallback-q3",
            category: "situational",
            question: "If a production incident occurs during peak hours and telemetry is ambiguous, how do you manage triage and resolution?",
            recruiterIntent: "Evaluates incident command structure, calm analytical deduction, rollback instincts, and blameless post-mortem culture.",
            resumeAnchor: `Anchored to your operational experience and high-availability expectations at ${companyName}.`,
            starModelAnswer: buildStarGuidance("production incident response"),
            pitfallsToAvoid: [
                "Attempting to test hotfixes directly in production.",
                "Neglecting stakeholder communication during incident triage.",
            ],
            isBookmarked: false,
            userPracticeResponse: "",
        },
    ];
}

export async function generateInterviewPrep(
    puterAiChat: InterviewPrepAiChat,
    options: InterviewPrepPromptOptions
): Promise<InterviewPrepSection> {
    const resumeText = options.resumeText?.trim() || "";
    if (resumeText.length < 50) {
        throw new Error("Resume content is too short to generate tailored interview questions. Please ensure document text is extracted.");
    }

    const prompt = prepareInterviewPrepPrompt(options);

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

    if (!parsed || !validateInterviewQuestions(parsed)) {
        throw new Error("Failed to parse valid interview questions from AI response.");
    }

    const questions: InterviewQuestion[] = parsed.questions.map((q, index) => {
        const rawCategory = ((q.category || "") as string).toLowerCase();
        const category: InterviewQuestionCategory =
            rawCategory.includes("tech")
                ? "technical"
                : rawCategory.includes("situa")
                ? "situational"
                : "behavioral";

        const starAnswer = (q.starModelAnswer || {}) as UnknownRecord;
        const fullAnswer =
            typeof starAnswer.fullAnswer === "string" && starAnswer.fullAnswer.trim().length > 0
                ? starAnswer.fullAnswer.trim()
                : `${starAnswer.situation || ""} ${starAnswer.task || ""} ${starAnswer.action || ""} ${starAnswer.result || ""}`.trim();

        return {
            id: (q.id as string) || `q-${index + 1}-${generateUUID().slice(0, 8)}`,
            category,
            question: String(q.question || "").trim(),
            recruiterIntent: String(q.recruiterIntent || q.interviewerIntent || "").trim(),
            resumeAnchor: String(q.resumeAnchor || "").trim(),
            starModelAnswer: {
                situation: String(starAnswer.situation || "").trim(),
                task: String(starAnswer.task || "").trim(),
                action: String(starAnswer.action || "").trim(),
                result: String(starAnswer.result || "").trim(),
                fullAnswer,
            },
            pitfallsToAvoid: Array.isArray(q.pitfallsToAvoid)
                ? q.pitfallsToAvoid.map((pitfall: unknown) => String(pitfall).trim()).filter(Boolean)
                : [],
            isBookmarked: false,
            userPracticeResponse: "",
        };
    });

    return {
        id: generateUUID(),
        roleTitle: options.jobTitle || "Software Engineer",
        targetRole: options.jobTitle || "Software Engineer",
        companyName: options.companyName || "Target Company",
        generatedAt: new Date().toISOString(),
        questions,
    };
}
