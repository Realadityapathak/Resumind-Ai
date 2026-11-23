import { useState, useRef, useEffect, useMemo, type FC } from "react";
import { usePuterStore } from "~/services/puter/store";
import { useSafeTimeout } from "~/hooks/useSafeTimeout";
import { executeCopilotTurn } from "~/features/copilot/copilotEngine";
import { generateUUID } from "~/utils/uuid";
import Icon from "~/components/ui/Icon";

interface AICopilotTabProps {
    resumeId?: string;
    parsedText?: string;
    jobTitle?: string;
    companyName?: string;
    jobDescription?: string;
    feedback: Feedback;
    keywordAnalysis?: KeywordAnalysis;
    chatHistory?: CopilotMessage[];
    onSaveChat: (messages: CopilotMessage[]) => Promise<void>;
    onNavigateTab?: (tabId: WorkspaceTabId, payload?: string) => void;
}

export const AICopilotTab: FC<AICopilotTabProps> = ({
    resumeId,
    parsedText = "",
    jobTitle = "Software Engineer",
    companyName = "Target Company",
    jobDescription = "",
    feedback,
    keywordAnalysis,
    chatHistory = [],
    onSaveChat,
    onNavigateTab,
}) => {
    const { ai } = usePuterStore();
    const scheduleTimeout = useSafeTimeout();
    const [messages, setMessages] = useState<CopilotMessage[]>(() => {
        if (chatHistory && chatHistory.length > 0) {
            return chatHistory;
        }
        return [
            {
                id: "welcome-message",
                role: "assistant",
                content: `Welcome to your Resumind AI Copilot!

I have analyzed your ${jobTitle} resume for ${companyName}.
Overall ATS Score: ${feedback?.overallScore ?? 0}/100
Missing Keywords: ${keywordAnalysis?.missingCount ?? 0} identified

Ask me anything about tailoring your bullets, bridging technical skill gaps, or preparing executive summaries. Or click any quick prompt below.`,
                timestamp: Date.now(),
                actionSuggestions: [
                    {
                        id: "init-star",
                        label: "Optimize with STAR",
                        actionType: "switch_tab",
                        tabTarget: "star",
                        icon: "✨",
                    },
                    {
                        id: "init-keywords",
                        label: "View Missing Keywords",
                        actionType: "switch_tab",
                        tabTarget: "keywords",
                        icon: "🎯",
                    },
                ],
            },
        ];
    });
    const [inputText, setInputText] = useState<string>("");
    const [isSending, setIsSending] = useState<boolean>(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const transcriptRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<CopilotMessage[]>(messages);
    messagesRef.current = messages;

    // Preserve legacy length-keyed synchronization; same-length replacements remain stale.
    useEffect(() => {
        if (chatHistory && chatHistory.length > 0) {
            setMessages(chatHistory);
        }
    }, [resumeId, chatHistory?.length]);

    // Scroll the transcript itself to the newest message; never move the page.
    useEffect(() => {
        const el = transcriptRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages, isSending]);

    const overallScore = feedback?.overallScore ?? 0;
    const missingCount = keywordAnalysis?.missingCount ?? 0;

    // Dynamic Quick Prompt Chips with ATS Score Interpolation
    const quickPromptChips = useMemo(() => [
        "Draft a 3-sentence executive summary",
        "Suggest 5 high-impact action verbs for my experience",
        `How can I boost my ATS score from ${overallScore} to 90+?`,
        "Analyze my biggest resume weaknesses",
    ], [overallScore]);

    // Send Message Handler
    const handleSendMessage = async (textToSend?: string) => {
        const text = (textToSend || inputText).trim();
        if (!text || isSending) return;

        setErrorMessage(null);
        const userMsg: CopilotMessage = {
            id: generateUUID(),
            role: "user",
            content: text,
            timestamp: Date.now(),
        };

        const priorHistory = messagesRef.current;
        const updatedHistory = [...priorHistory, userMsg];
        messagesRef.current = updatedHistory;
        setMessages(updatedHistory);
        setInputText("");
        setIsSending(true);

        try {
            const assistantMsg = await executeCopilotTurn(ai.chat, {
                userMessage: text,
                conversationHistory: priorHistory,
                resumeContext: {
                    parsedText,
                    feedback,
                    keywordAnalysis,
                    targetRole: jobTitle,
                    companyName,
                    jobDescription,
                },
            });

            const newMessages = [...messagesRef.current, assistantMsg];
            messagesRef.current = newMessages;
            if (isMountedRef.current) {
                setMessages(newMessages);
            }
            try {
                await onSaveChat(newMessages);
            } catch (saveErr) {
                console.error("Failed to save Copilot response:", saveErr);
                if (isMountedRef.current) {
                    setErrorMessage(
                        "The AI response is visible in this tab, but the chat history could not be saved to your resume and may be lost on reload."
                    );
                }
            }
        } catch (err: unknown) {
            const copilotError = err as { message?: string } | null | undefined;
            console.error("AI Copilot turn failed:", err);
            if (isMountedRef.current) {
                setErrorMessage(copilotError?.message || "Failed to receive response from AI. Please try again.");
            }
            const errorMsg: CopilotMessage = {
                id: generateUUID(),
                role: "assistant",
                content: `Error: ${copilotError?.message || "Unable to process inquiry. Please check your Puter connection."}`,
                timestamp: Date.now(),
                isError: true,
            };
            const withError = [...messagesRef.current, errorMsg];
            messagesRef.current = withError;
            if (isMountedRef.current) {
                setMessages(withError);
            }
            try {
                await onSaveChat(withError);
            } catch (saveErr) {
                console.error("Failed to save Copilot error turn:", saveErr);
            }
        } finally {
            if (isMountedRef.current) {
                setIsSending(false);
            }
        }
    };

    // Clear Chat History Handler
    const handleClearHistory = async () => {
        if (typeof window !== "undefined" && window.confirm) {
            if (!window.confirm("Are you sure you want to clear your Copilot chat history for this resume?")) {
                return;
            }
        }
        try {
            await onSaveChat([]);
            setMessages([]);
            setErrorMessage(null);
        } catch (err) {
            console.error("Failed to clear Copilot history:", err);
            setErrorMessage(
                "The chat history could not be cleared from your resume. Please try again."
            );
        }
    };

    // Action Trigger Handler (Action Engine Bridge)
    const handleActionClick = (action: CopilotActionSuggestion) => {
        const target = action.tabTarget || action.targetTab;
        const type = action.actionType || action.type;

        if ((type === "switch_tab" || type === "navigate_tab") && target && onNavigateTab) {
            onNavigateTab(target, action.payload);
        } else if (type === "copy_text" && action.payload) {
            if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(action.payload);
            }
            setCopiedId(action.id || "copied");
            scheduleTimeout(() => setCopiedId(null), 2000);
        } else if (type === "quick_prompt" && action.payload) {
            handleSendMessage(action.payload);
        }
    };

    const actionIcon = (action: CopilotActionSuggestion) => {
        const type = action.actionType || action.type;
        if (type === "copy_text") return "copy" as const;
        if (type === "quick_prompt") return "send" as const;
        return "arrow-right" as const;
    };

    return (
        <div
            id="tabpanel-copilot"
            role="tabpanel"
            aria-labelledby="tab-copilot"
            className="flex h-[calc(100vh-14rem)] min-h-[550px] animate-fadeIn flex-col overflow-hidden border border-rule bg-surface"
        >
            {/* Context band */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rule bg-surface-2 px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                    <span
                        className="truncate text-[11px] font-medium text-ink-2"
                        data-testid="copilot-context-status"
                    >
                        Resumind Interactive AI Copilot
                        <span className="text-ink-4"> · </span>
                        {jobTitle || "Resume"}
                        <span className="text-ink-4"> · </span>
                        ATS {overallScore}/100
                        <span className="text-ink-4"> · </span>
                        {missingCount} Missing Keywords
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <span className="hidden border border-rule bg-paper px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-ink-3 sm:inline">
                        Gemini 2.5 Flash
                    </span>
                    <button
                        type="button"
                        onClick={handleClearHistory}
                        title="Clear conversation history"
                        aria-label="Clear chat history"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center border border-transparent text-ink-4 transition-colors hover:border-rule hover:bg-paper hover:text-rust lg:h-7 lg:w-7"
                    >
                        <Icon name="trash" size={12} />
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-rule border-l-2 border-l-rust bg-red-50 px-3 py-2 text-[11px] text-red-800">
                    <span className="flex items-start gap-2">
                        <Icon name="alert" size={12} className="mt-0.5 shrink-0" />
                        {errorMessage}
                    </span>
                    <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        aria-label="Dismiss error"
                        className="shrink-0 cursor-pointer p-0.5 text-red-600 transition-colors hover:text-red-900"
                    >
                        <Icon name="close" size={11} />
                    </button>
                </div>
            )}

            {/* Transcript */}
            <div
                ref={transcriptRef}
                className="flex-1 space-y-4 overflow-y-auto bg-paper px-3 py-4 sm:px-4"
                data-testid="copilot-transcript"
            >
                {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    let formattedTime = "";
                    if (typeof msg.timestamp === "number" && !isNaN(msg.timestamp)) {
                        try {
                            formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        } catch {
                            // Fallback on invalid time value
                        }
                    }

                    const rawSuggestions = Array.isArray(msg.actionSuggestions)
                        ? msg.actionSuggestions
                        : (msg.actionSuggestion ? [msg.actionSuggestion] : []);
                    const suggestions = rawSuggestions.filter((s): s is CopilotActionSuggestion => Boolean(s && typeof s === "object"));

                    return (
                        <div
                            key={msg.id}
                            className={`message-in flex flex-col ${isUser ? "items-end" : "items-start"} max-w-full`}
                        >
                            {isUser ? (
                                <>
                                    <span className="mb-1 px-0.5 text-[9px] uppercase tracking-[0.08em] text-ink-4">
                                        You{formattedTime ? ` · ${formattedTime}` : ""}
                                    </span>
                                    <div className="max-w-[85%] whitespace-pre-wrap border border-ink bg-ink px-3.5 py-2.5 text-[11.5px] leading-relaxed text-paper sm:max-w-[75%]">
                                        {msg.content}
                                    </div>
                                </>
                            ) : (
                                <div
                                    className={`max-w-[90%] border bg-surface sm:max-w-[80%] ${
                                        msg.isError ? "border-red-200 border-l-2 border-l-rust" : "border-rule border-l-2 border-l-cobalt"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3 border-b border-rule px-3 py-1.5">
                                        <span className={`flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                                            msg.isError ? "text-rust" : "text-cobalt"
                                        }`}>
                                            <Icon name={msg.isError ? "alert" : "sparkle"} size={10} />
                                            Resumind Copilot
                                        </span>
                                        {formattedTime && (
                                            <span className="text-[9px] tabular-nums text-ink-4">{formattedTime}</span>
                                        )}
                                    </div>
                                    <div className={`whitespace-pre-wrap px-3 py-2.5 text-[11.5px] leading-relaxed ${
                                        msg.isError ? "text-red-800" : "text-ink-2"
                                    }`}>
                                        {msg.content}
                                    </div>

                                    {/* Action Engine Bridge: suggestion CTAs */}
                                    {suggestions.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 border-t border-rule px-3 py-2">
                                            {suggestions.map((action, aIdx) => {
                                                const type = action.actionType || action.type;
                                                return (
                                                    <button
                                                        key={action.id || aIdx}
                                                        type="button"
                                                        onClick={() => handleActionClick(action)}
                                                        className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 border border-rule bg-paper px-2.5 py-1 text-[10px] font-semibold text-cobalt transition-colors hover:border-cobalt/40 hover:bg-cobalt-wash sm:min-h-[28px]"
                                                    >
                                                        <Icon name={actionIcon(action)} size={10} />
                                                        <span>{action.label}</span>
                                                        {type === "copy_text" && copiedId === (action.id || "copied") && (
                                                            <span className="ml-0.5 font-semibold text-forest">✓ Copied</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Thinking indicator */}
                {isSending && (
                    <div className="flex items-center gap-2 border border-rule border-l-2 border-l-cobalt bg-surface px-3 py-2 text-[11px] text-ink-3">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cobalt" />
                        <span>Resumind Copilot is thinking...</span>
                    </div>
                )}
            </div>

            {/* Quick prompts */}
            <div className="shrink-0 border-t border-rule bg-surface-2 px-3 py-2">
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                    Quick prompts
                </span>
                <div className="no-scrollbar mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
                    {quickPromptChips.map((chip, idx) => (
                        <button
                            key={idx}
                            type="button"
                            disabled={isSending}
                            onClick={() => handleSendMessage(chip)}
                            className="min-h-[36px] shrink-0 cursor-pointer whitespace-nowrap border border-rule bg-surface px-2.5 py-1 text-[10px] font-medium text-ink-3 transition-colors hover:border-cobalt/40 hover:text-cobalt disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[28px]"
                        >
                            {chip}
                        </button>
                    ))}
                </div>
            </div>

            {/* Composer */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                }}
                className="composer-form flex shrink-0 items-center gap-2 border-t border-rule bg-surface p-2.5 sm:p-3"
            >
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask Resumind Copilot about your resume, scores, or skill gaps..."
                    disabled={isSending}
                    className="min-h-[38px] flex-1 border border-rule bg-paper px-3 py-2 text-[12px] placeholder:text-ink-4 focus:border-cobalt focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="primary-button min-h-[38px] shrink-0 !px-4 !py-2 text-[11px]"
                >
                    {isSending ? "Sending..." : "Send"}
                </button>
            </form>
        </div>
    );
};

export default AICopilotTab;
