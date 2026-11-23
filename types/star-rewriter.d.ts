// ==========================================
// STAR BULLET REWRITER TYPES
// ==========================================

type StarToneFocus =
    | "metrics-focused"
    | "leadership-focused"
    | "technical-depth"
    | "action-oriented"
    | "executive";

interface StarBreakdown {
    situation: string;
    task: string;
    action: string;
    result: string;
    metrics: string[];
}

interface StarVariant {
    id: string;
    type: StarToneFocus;
    fullBullet: string;
    starBreakdown: StarBreakdown;
    explanation: string;
}

interface StarRewriteResult {
    id: string;
    originalBullet: string;
    targetRole?: string;
    roleContext?: string;
    tone?: string;
    toneFocus?: StarToneFocus;
    variants: StarVariant[];
    critique: string;
    createdAt: string;
}
