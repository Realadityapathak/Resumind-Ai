import { prepareCopilotPrompt, type PrepareCopilotPromptOptions } from "./prompt";
import { cleanJson, safeJsonParse } from "~/utils/json";
import { generateUUID } from "~/utils/uuid";

interface CopilotAiResponse {
    message?: {
        content: string | { text?: string }[];
    };
}

type CopilotAiChat = (
    prompt: { role: "user"; content: string }[],
    options?: { model: string }
) => Promise<CopilotAiResponse | null | undefined>;

interface CopilotResponsePayload extends Record<string, unknown> {
    reply: string;
    actionSuggestions?: unknown;
}

export function validateCopilotResponse(data: unknown): data is CopilotResponsePayload {
    if (!data || typeof data !== "object") return false;
    return typeof (data as { reply?: unknown }).reply === "string";
}

export async function executeCopilotTurn(
    puterAiChat: CopilotAiChat,
    options: PrepareCopilotPromptOptions
): Promise<CopilotMessage> {
    const trimmedMessage = options.userMessage?.trim() || "";
    if (trimmedMessage.length === 0) {
        throw new Error("User message cannot be empty.");
    }

    const prompt = prepareCopilotPrompt(options);

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

    let reply: string;
    let actionSuggestions: CopilotActionSuggestion[] = [];

    if (parsed && validateCopilotResponse(parsed)) {
        reply = parsed.reply.trim();
        if (Array.isArray(parsed.actionSuggestions)) {
            actionSuggestions = parsed.actionSuggestions
                .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === "object"))
                .map((action: Record<string, unknown>, idx) => ({
                    id: (action.id as string) || `action-${idx + 1}`,
                    label: (action.label as string) || "Take Action",
                    actionType: (action.actionType as CopilotActionType) || "switch_tab",
                    type: (action.type as CopilotActionSuggestion["type"]) || (action.actionType as CopilotActionType) || "switch_tab",
                    tabTarget: (action.tabTarget || action.targetTab) as WorkspaceTabId | undefined,
                    targetTab: (action.targetTab || action.tabTarget) as WorkspaceTabId | undefined,
                    payload: action.payload as string | undefined,
                    icon: (action.icon as string) || "✨",
                }));
        }
    } else {
        // Resilient Fallback: If AI returned plain markdown without JSON wrapping
        reply = rawText.trim() || "I analyzed your resume context. How else can I assist your job search?";

        // Synthesize contextual action triggers based on keywords in response
        const lowerReply = reply.toLowerCase();
        if (lowerReply.includes("star") || lowerReply.includes("bullet") || lowerReply.includes("quantif")) {
            actionSuggestions.push({
                id: "fallback-star",
                label: "Optimize with STAR",
                actionType: "switch_tab",
                type: "switch_tab",
                tabTarget: "star",
                targetTab: "star",
                icon: "✨",
            });
        }
        if (lowerReply.includes("keyword") || lowerReply.includes("ats") || lowerReply.includes("miss")) {
            actionSuggestions.push({
                id: "fallback-keywords",
                label: "View Missing Keywords",
                actionType: "switch_tab",
                type: "switch_tab",
                tabTarget: "keywords",
                targetTab: "keywords",
                icon: "🎯",
            });
        }
        if (lowerReply.includes("cover letter")) {
            actionSuggestions.push({
                id: "fallback-cover",
                label: "Draft Cover Letter",
                actionType: "switch_tab",
                type: "switch_tab",
                tabTarget: "cover-letter",
                targetTab: "cover-letter",
                icon: "✉️",
            });
        }
        if (lowerReply.includes("interview") || lowerReply.includes("question")) {
            actionSuggestions.push({
                id: "fallback-interview",
                label: "Practice Interview Q&A",
                actionType: "switch_tab",
                type: "switch_tab",
                tabTarget: "interview-prep",
                targetTab: "interview-prep",
                icon: "🎤",
            });
        }
    }

    return {
        id: generateUUID(),
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
        actionSuggestions: actionSuggestions.length > 0 ? actionSuggestions : undefined,
    };
}
