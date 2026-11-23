import { useEffect, useRef, type FC } from "react";
import Icon, { type IconName } from "~/components/ui/Icon";

interface WorkspaceTabsProps {
    activeTab: WorkspaceTabId;
    onTabChange: (tabId: WorkspaceTabId) => void;
    feedback: Feedback;
    keywordAnalysis?: KeywordAnalysis;
    savedStarCount?: number;
    savedCoverLetterCount?: number;
    interviewPrep?: InterviewPrepSection;
    copilotChat?: CopilotMessage[];
}

interface TabDefinition {
    id: WorkspaceTabId;
    label: string;
    icon: IconName;
    getBadge: (props: WorkspaceTabsProps) => { text: string; variant: "green" | "yellow" | "red" | "indigo" | "gray" };
}

export const TAB_DEFINITIONS: TabDefinition[] = [
    {
        id: "overview",
        label: "Overview",
        icon: "chart",
        getBadge: ({ feedback }) => ({
            text: `${feedback?.overallScore ?? 0}/100`,
            variant: (feedback?.overallScore ?? 0) >= 70 ? "green" : (feedback?.overallScore ?? 0) >= 50 ? "yellow" : "red",
        }),
    },
    {
        id: "details",
        label: "Deep Dive",
        icon: "search",
        getBadge: ({ feedback }) => {
            const atsTips = feedback?.ATS?.tips?.length || 0;
            const toneTips = feedback?.toneAndStyle?.tips?.length || 0;
            const contentTips = feedback?.content?.tips?.length || 0;
            const structureTips = feedback?.structure?.tips?.length || 0;
            const skillsTips = feedback?.skills?.tips?.length || 0;
            const total = atsTips + toneTips + contentTips + structureTips + skillsTips;
            return { text: `${total} Tips`, variant: "gray" };
        },
    },
    {
        id: "keywords",
        label: "Keyword Gap",
        icon: "target",
        getBadge: ({ keywordAnalysis }) => {
            if (!keywordAnalysis) return { text: "Scan", variant: "indigo" };
            return {
                text: `${keywordAnalysis.missingCount} Missing`,
                variant: keywordAnalysis.missingCount === 0 ? "green" : "yellow",
            };
        },
    },
    {
        id: "star",
        label: "STAR Rewriter",
        icon: "pen",
        getBadge: ({ savedStarCount }) => ({
            text: savedStarCount && savedStarCount > 0 ? `${savedStarCount} Saved` : "3 Modes",
            variant: "indigo",
        }),
    },
    {
        id: "cover-letter",
        label: "Cover Letter",
        icon: "file",
        getBadge: ({ savedCoverLetterCount }) => ({
            text: savedCoverLetterCount && savedCoverLetterCount > 0 ? `${savedCoverLetterCount} Saved` : "Ready",
            variant: savedCoverLetterCount && savedCoverLetterCount > 0 ? "indigo" : "gray",
        }),
    },
    {
        id: "interview-prep",
        label: "Interview Prep",
        icon: "message",
        getBadge: ({ interviewPrep }) => {
            const count = interviewPrep?.questions?.length || 0;
            if (count > 0) {
                return { text: `${count} Qs`, variant: "indigo" };
            }
            return { text: "Ready", variant: "gray" };
        },
    },
    {
        id: "copilot",
        label: "AI Copilot",
        icon: "sparkle",
        getBadge: ({ copilotChat }) => {
            const count = copilotChat?.filter((m) => m.role === "user").length || 0;
            if (count > 0) {
                return { text: `${count} Chat${count > 1 ? "s" : ""}`, variant: "indigo" };
            }
            return { text: "Ready", variant: "gray" };
        },
    },
];

export const WorkspaceTabs: FC<WorkspaceTabsProps> = (props) => {
    const { activeTab, onTabChange } = props;
    const listRef = useRef<HTMLDivElement>(null);

    // Keep the selected tab in view when the rail overflows on narrow screens.
    useEffect(() => {
        const list = listRef.current;
        const active = list?.querySelector<HTMLElement>('[aria-selected="true"]');
        if (!list || !active || list.scrollWidth <= list.clientWidth) return;

        const listRect = list.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        const centered =
            list.scrollLeft +
            (activeRect.left - listRect.left) -
            (listRect.width - activeRect.width) / 2;
        const maxScroll = list.scrollWidth - list.clientWidth;
        list.scrollLeft = Math.max(0, Math.min(centered, maxScroll));
    }, [activeTab]);

    return (
        <div
            ref={listRef}
            role="tablist"
            aria-label="Resume Workspace Tabs"
            className="no-scrollbar flex select-none items-stretch overflow-x-auto border border-rule bg-surface-2"
        >
            {TAB_DEFINITIONS.map((tab) => {
                const isActive = activeTab === tab.id;
                const badge = tab.getBadge(props);

                let badgeColorClasses = "border-rule bg-surface text-ink-3";
                if (badge.variant === "green") {
                    badgeColorClasses = "border-green-200 bg-green-50 text-green-700";
                } else if (badge.variant === "yellow") {
                    badgeColorClasses = "border-amber-200 bg-amber-50 text-amber-800";
                } else if (badge.variant === "red") {
                    badgeColorClasses = "border-red-200 bg-red-50 text-red-700";
                } else if (badge.variant === "indigo") {
                    badgeColorClasses = "border-cobalt/25 bg-cobalt-wash text-cobalt";
                }

                return (
                    <button
                        key={tab.id}
                        role="tab"
                        id={`tab-${tab.id}`}
                        aria-selected={isActive}
                        aria-controls={`tabpanel-${tab.id}`}
                        onClick={() => onTabChange(tab.id)}
                        className={`relative flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-r border-rule px-2.5 py-2.5 text-[11px] font-semibold transition-colors last:border-r-0 after:absolute after:inset-x-0 after:bottom-[-1px] after:h-[2px] after:origin-left after:bg-ink after:transition-transform after:duration-300 sm:gap-2 sm:px-3.5 sm:text-[12px] lg:flex-1 lg:justify-center lg:gap-1.5 lg:px-2.5 lg:text-[11px] xl:gap-2 xl:px-3.5 xl:text-[12px] ${
                            isActive
                                ? "bg-surface text-ink after:scale-x-100"
                                : "bg-transparent text-ink-3 after:scale-x-0 hover:bg-white/70 hover:text-ink"
                        }`}
                    >
                        <Icon
                            name={tab.icon}
                            size={13}
                            className={`tab-icon transition-colors duration-200 ${isActive ? "text-cobalt" : "text-ink-4"}`}
                        />
                        <span>{tab.label}</span>
                        <span
                            className={`ml-0.5 rounded-[2px] border px-1.5 py-0.5 text-[9px] font-semibold leading-none tabular-nums transition-colors ${badgeColorClasses}`}
                        >
                            {badge.text}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default WorkspaceTabs;
