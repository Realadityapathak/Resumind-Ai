import { prepareStarRewriterPrompt, type StarRewriterPromptOptions } from "./prompt";
import { cleanJson, safeJsonParse } from "~/utils/json";
import { generateUUID } from "~/utils/uuid";

interface StarRewriterAiResponse {
    message?: {
        content: string | { text?: string }[];
    };
}

type StarRewriterAiChat = (
    prompt: { role: "user"; content: string }[],
    options?: { model: string }
) => Promise<StarRewriterAiResponse | null | undefined>;

interface StarBreakdownCandidate {
    situation?: unknown;
    task?: unknown;
    action?: unknown;
    result?: unknown;
    metrics?: unknown;
}

interface StarVariantCandidate {
    id?: unknown;
    type?: unknown;
    fullBullet?: unknown;
    starBreakdown?: StarBreakdownCandidate;
    explanation?: unknown;
}

interface ValidatedStarVariant extends StarVariantCandidate {
    fullBullet: string;
    starBreakdown: StarBreakdownCandidate & {
        situation: string;
        task: string;
        action: string;
        result: string;
    };
}

interface StarRewriteResponseSchema {
    variants: ValidatedStarVariant[];
    critique?: unknown;
}

export function validateStarRewriteResult(data: unknown): data is StarRewriteResponseSchema {
    if (!data || typeof data !== "object") return false;
    const candidate = data as { variants?: unknown };
    if (!Array.isArray(candidate.variants) || candidate.variants.length === 0) return false;
    return candidate.variants.every(
        (value: unknown) => {
            if (!value || typeof value !== "object") return false;
            const variant = value as StarVariantCandidate;
            return typeof variant.fullBullet === "string" &&
                variant.fullBullet.trim().length > 0 &&
                Boolean(variant.starBreakdown) &&
                typeof variant.starBreakdown === "object" &&
                typeof variant.starBreakdown.situation === "string" &&
                typeof variant.starBreakdown.task === "string" &&
                typeof variant.starBreakdown.action === "string" &&
                typeof variant.starBreakdown.result === "string";
        }
    );
}

export async function rewriteBulletWithStar(
    puterAiChat: StarRewriterAiChat,
    options: StarRewriterPromptOptions
): Promise<StarRewriteResult> {
    const trimmed = options.bulletPoint?.trim() || "";
    if (trimmed.length < 5) {
        throw new Error("Please enter a valid bullet point with at least 5 characters to rewrite.");
    }

    const prompt = prepareStarRewriterPrompt(options);

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

    if (!parsed || !validateStarRewriteResult(parsed)) {
        throw new Error("Failed to parse valid STAR rewrite variants from AI response.");
    }

    const variants: StarVariant[] = parsed.variants.map((variant, index) => ({
        id: (variant.id as string) || `variant-${index + 1}`,
        type:
            (variant.type as StarToneFocus) ||
            (index === 0 ? "action-oriented" : index === 1 ? "metrics-focused" : "technical-depth"),
        fullBullet: variant.fullBullet.trim(),
        starBreakdown: {
            situation: variant.starBreakdown.situation || "",
            task: variant.starBreakdown.task || "",
            action: variant.starBreakdown.action || "",
            result: variant.starBreakdown.result || "",
            metrics: Array.isArray(variant.starBreakdown.metrics)
                ? (variant.starBreakdown.metrics as string[])
                : [],
        },
        explanation: (variant.explanation as string) || "",
    }));

    return {
        id: generateUUID(),
        originalBullet: trimmed,
        targetRole: options.targetRole,
        roleContext: options.jobDescription,
        tone: options.tonePreference,
        critique:
            (parsed.critique as string) ||
            "Enhanced original bullet point with quantifiable impact and active verbs.",
        variants,
        createdAt: new Date().toISOString(),
    };
}
