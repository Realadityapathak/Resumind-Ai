import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Home from "~/routes/home";
import { usePuterStore } from "~/services/puter/store";

describe("Commercial SaaS Landing Page (app/routes/home.tsx)", () => {
  beforeAll(() => {
    if (typeof SVGElement !== "undefined" && !(SVGElement.prototype as any).getTotalLength) {
      (SVGElement.prototype as any).getTotalLength = () => 125.66;
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    usePuterStore.setState({
      authStatus: "unauthenticated",
      puterReady: true,
      isLoading: false,
      auth: {
        user: null,
        isAuthenticated: false,
        authStatus: "unauthenticated",
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        checkAuthStatus: vi.fn(async () => false),
        getUser: () => null,
      },
    });
  });

  it("renders the public landing page without redirecting unauthenticated visitors", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Home />
      </MemoryRouter>
    );

    // Assert main headline is present
    const mainHeading = screen.getByRole("heading", { level: 1 });
    expect(mainHeading).toHaveTextContent(/Land/i);
    expect(mainHeading).toHaveTextContent(/3.2x More/i);
    expect(mainHeading).toHaveTextContent(/Interviews with AI Resume Intelligence/i);

    // Assert primary conversion button is rendered
    expect(
      screen.getByRole("link", { name: /Analyze Your Resume Free →/i })
    ).toHaveAttribute("href", "/upload");
  });

  it("renders the 4 metrics cards in the metrics banner", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByTestId("metric-resumes")).toHaveTextContent("25,000+");
    expect(screen.getByTestId("metric-passrate")).toHaveTextContent("98%");
    expect(screen.getByTestId("metric-callbacks")).toHaveTextContent("3.2x");
    expect(screen.getByTestId("metric-latency")).toHaveTextContent("< 15s");
  });

  it("renders all 5 core feature pillars", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText("Smart ATS Diagnostic Scoring")).toBeInTheDocument();
    expect(screen.getByText("AI-Powered STAR Method Rewriter")).toBeInTheDocument();
    expect(screen.getByText("Target Job Keyword Gap Matcher")).toBeInTheDocument();
    expect(screen.getByText("Tailored Cover Letter Generator")).toBeInTheDocument();
    expect(screen.getByText("Interactive AI Copilot Assistant")).toBeInTheDocument();
  });

  it("toggles the interactive score gauge preview between Before (54) and After (92)", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Home />
      </MemoryRouter>
    );

    // Initial default is 'after' (92/100)
    expect(screen.getByText("92/100")).toBeInTheDocument();
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getByText(/98% ATS keyword alignment/i)).toBeInTheDocument();

    // Click 'Before (54)' button
    const beforeBtn = screen.getByRole("button", { name: /Before \(54\)/i });
    fireEvent.click(beforeBtn);

    // Expect score gauge to update to 54 and show Needs Work / Good Start
    expect(screen.getByText("54/100")).toBeInTheDocument();
    expect(screen.getByText("Good Start")).toBeInTheDocument();
    expect(screen.getByText(/8 critical ATS keywords missing/i)).toBeInTheDocument();

    // Click back to 'After (92)'
    const afterBtn = screen.getByRole("button", { name: /After \(92\)/i });
    fireEvent.click(afterBtn);

    expect(screen.getByText("92/100")).toBeInTheDocument();
  });

  it("renders testimonials with 5-star ratings", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText("Sarah Jenkins")).toBeInTheDocument();
    expect(screen.getByText("David Chen")).toBeInTheDocument();
    expect(screen.getByText("Elena Rostova")).toBeInTheDocument();
  });

  it("renders FAQ Accordion and allows expanding answers", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Home />
      </MemoryRouter>
    );

    const faq2Header = screen.getByText(/Is my resume data private and confidential\?/i);
    fireEvent.click(faq2Header);

    expect(screen.getByText(/Yes, 100%. Resumind is built on Puter.js serverless architecture./i)).toBeInTheDocument();
  });
});
