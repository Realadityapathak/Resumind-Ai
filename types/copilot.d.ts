// ==========================================
// AI COPILOT & ACTION ENGINE TYPES
// ==========================================

type CopilotRole = "user" | "assistant" | "system";

type CopilotActionType =
    | "switch_tab"
    | "copy_text"
    | "quick_prompt"
    | "navigate_tab"
    | "apply_tip";

interface CopilotActionSuggestion {
    id?: string;
    label: string;
    actionType?: CopilotActionType;
    type?: "navigate_tab" | "copy_text" | "apply_tip" | "switch_tab" | "quick_prompt";
    tabTarget?: WorkspaceTabId;
    targetTab?: WorkspaceTabId;
    payload?: string;
    icon?: string;
}

interface CopilotMessage {
    id: string;
    role: CopilotRole;
    content: string;
    timestamp: number | string;
    actionSuggestions?: CopilotActionSuggestion[];
    actionSuggestion?: CopilotActionSuggestion;
    actionTrigger?: {
        type: "copy_text" | "switch_tab" | "apply_rewrite";
        payload?: string;
    };
    isError?: boolean;
}

interface CopilotResumeContext {
    parsedText?: string;
    feedback?: Feedback;
    keywordAnalysis?: KeywordAnalysis;
    targetRole?: string;
    companyName?: string;
    jobDescription?: string;
}
