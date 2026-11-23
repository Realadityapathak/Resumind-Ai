import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreBadge from "~/components/ui/ScoreBadge";

describe("ATS Scoring & Badge Evaluations", () => {
  describe("ScoreBadge Thresholds", () => {
    it("renders 'Strong' and green styling for scores > 70", () => {
      const { rerender } = render(<ScoreBadge score={71} />);
      expect(screen.getByText("Strong")).toBeInTheDocument();
      expect(screen.getByText("Strong").parentElement).toHaveClass("bg-badge-green text-green-600");

      rerender(<ScoreBadge score={100} />);
      expect(screen.getByText("Strong")).toBeInTheDocument();
    });

    it("renders 'Good Start' and yellow styling for scores 50 to 70", () => {
      const { rerender } = render(<ScoreBadge score={70} />);
      expect(screen.getByText("Good Start")).toBeInTheDocument();
      expect(screen.getByText("Good Start").parentElement).toHaveClass("bg-badge-yellow text-yellow-600");

      rerender(<ScoreBadge score={50} />);
      expect(screen.getByText("Good Start")).toBeInTheDocument();
    });

    it("renders 'Needs Work' and red styling for scores < 50", () => {
      const { rerender } = render(<ScoreBadge score={49} />);
      expect(screen.getByText("Needs Work")).toBeInTheDocument();
      expect(screen.getByText("Needs Work").parentElement).toHaveClass("bg-badge-red text-red-600");

      rerender(<ScoreBadge score={0} />);
      expect(screen.getByText("Needs Work")).toBeInTheDocument();
    });

    it("renders variant='score' with score and icon", () => {
      render(<ScoreBadge score={85} variant="score" />);
      expect(screen.getByText("85/100")).toBeInTheDocument();
      const img = screen.getByAltText("score status");
      expect(img).toHaveAttribute("src", "/icons/check.svg");
    });
  });

});
