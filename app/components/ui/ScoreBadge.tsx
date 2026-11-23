import type { FC } from "react";
import { cn } from "~/utils/classNames";

export interface ScoreBadgeProps {
  score: number;
  variant?: "label" | "score";
  className?: string;
}

export const getScoreTier = (score: number) => {
  if (score > 70) {
    return {
      tier: "strong",
      label: "Strong",
      bgColor: "bg-badge-green",
      textColor: "text-green-600",
      scoreTextColor: "text-badge-green-text",
      icon: "/icons/check.svg",
    };
  }
  if (score >= 50) {
    return {
      tier: "moderate",
      label: "Good Start",
      bgColor: "bg-badge-yellow",
      textColor: "text-yellow-600",
      scoreTextColor: "text-badge-yellow-text",
      icon: "/icons/warning.svg",
    };
  }
  return {
    tier: "weak",
    label: "Needs Work",
    bgColor: "bg-badge-red",
    textColor: "text-red-600",
    scoreTextColor: "text-badge-red-text",
    icon: "/icons/warning.svg",
  };
};

const ScoreBadge: FC<ScoreBadgeProps> = ({ score, variant = "label", className }) => {
  const { label, bgColor, textColor, scoreTextColor, icon } = getScoreTier(score);

  if (variant === "score") {
    return (
      <div
        className={cn(
          "inline-flex flex-row gap-1.5 items-center px-2 py-0.5 rounded-[3px] border border-current/15",
          bgColor,
          className
        )}
      >
        <img src={icon} alt="score status" className="size-3.5" />
        <p className={cn("text-[13px] font-semibold tabular-nums", scoreTextColor)}>{score}/100</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex px-2.5 py-1 rounded-[3px] border border-current/15",
        bgColor,
        textColor,
        className
      )}
    >
      <p className="text-[12px] font-semibold">{label}</p>
    </div>
  );
};

export default ScoreBadge;
