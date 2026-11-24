import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import Workspace from "~/routes/workspace";
import { usePuterStore } from "~/services/puter/store";
import { telemetry } from "~/services/telemetry";

const mockResumes: Resume[] = [
  {
    id: "resume-1",
    companyName: "Google",
    jobTitle: "Senior Staff Engineer",
    fileName: "Senior_Staff_Google.pdf",
    imagePath: "resumes/img_1.png",
    imagePaths: ["resumes/img_1.png"],
    resumePath: "resumes/Senior_Staff_Google.pdf",
    parsedText: "Staff engineer with distributed systems experience",
    pageCount: 1,
    isScanned: false,
    ocrApplied: false,
    feedback: {
      overallScore: 92,
      ATS: { score: 95, tips: [{ type: "good", tip: "Flawless layout" }] },
      toneAndStyle: { score: 90, tips: [] },
      content: { score: 91, tips: [] },
      structure: { score: 92, tips: [] },
      skills: { score: 92, tips: [] },
    },
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "resume-2",
    companyName: "Stripe",
    jobTitle: "Frontend Architect",
    fileName: "Stripe_Frontend.pdf",
    imagePath: "resumes/img_2.png",
    imagePaths: ["resumes/img_2.png"],
    resumePath: "resumes/Stripe_Frontend.pdf",
    parsedText: "Architect specialized in React, TypeScript and web performance",
    pageCount: 2,
    isScanned: false,
    ocrApplied: false,
    feedback: {
      overallScore: 68,
      ATS: { score: 65, tips: [{ type: "improve", tip: "Add metrics" }] },
      toneAndStyle: { score: 70, tips: [] },
      content: { score: 68, tips: [] },
      structure: { score: 70, tips: [] },
      skills: { score: 67, tips: [] },
    },
    createdAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "resume-3",
    companyName: "Startup Inc",
    jobTitle: "Junior Designer",
    fileName: "Designer_Resume.pdf",
    imagePath: "resumes/img_3.png",
    imagePaths: ["resumes/img_3.png"],
    resumePath: "resumes/Designer_Resume.pdf",
    parsedText: "UI designer with Figma and HTML experience",
    pageCount: 1,
    isScanned: false,
    ocrApplied: false,
    feedback: {
      overallScore: 45,
      ATS: { score: 40, tips: [{ type: "improve", tip: "Improve ATS parsing" }] },
      toneAndStyle: { score: 50, tips: [] },
      content: { score: 45, tips: [] },
      structure: { score: 45, tips: [] },
      skills: { score: 45, tips: [] },
    },
    createdAt: "2026-01-03T00:00:00.000Z",
  },
];

describe("AI Workspace Route (app/routes/workspace.tsx)", () => {
  const mockKvList = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockKvList.mockResolvedValue(
      mockResumes.map((r) => ({
        key: `resume:${r.id}`,
        value: r,
      }))
    );

    usePuterStore.setState({
      authStatus: "authenticated",
      puterReady: true,
      isLoading: false,
      auth: {
        user: { username: "alexdev", uuid: "user-123" } as PuterUser,
        isAuthenticated: true,
        authStatus: "authenticated",
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        checkAuthStatus: vi.fn(async () => true),
        getUser: () => ({ username: "alexdev", uuid: "user-123" } as PuterUser),
      },
      kv: {
        list: mockKvList,
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        flush: vi.fn(),
      } as any,
    });
  });

  it("redirects unauthenticated users to /auth with next parameter via AuthGuard", async () => {
    usePuterStore.setState({
      authStatus: "unauthenticated",
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

    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <Routes>
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/auth" element={<div data-testid="auth-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-page")).toBeInTheDocument();
    });
  });

  it("renders the 4 AI workspace capabilities in the ledger", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <Workspace />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("AI Optimization Studio")).toBeInTheDocument();
      expect(screen.getByText("STAR Bullet Rewriter")).toBeInTheDocument();
      expect(screen.getByText("Keyword Gap Matcher")).toBeInTheDocument();
      expect(screen.getByText("Tailored Cover Letter")).toBeInTheDocument();
      expect(screen.getByText("24/7 AI Copilot")).toBeInTheDocument();
    });
  });

  it("loads resumes from Puter KV and renders resume cards with scores", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <Workspace />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Senior Staff Engineer")).toBeInTheDocument();
      expect(screen.getByText("Google")).toBeInTheDocument();
      expect(screen.getByText("92/100")).toBeInTheDocument();

      expect(screen.getByText("Frontend Architect")).toBeInTheDocument();
      expect(screen.getByText("Stripe")).toBeInTheDocument();
      expect(screen.getByText("68/100")).toBeInTheDocument();

      expect(screen.getByText("Junior Designer")).toBeInTheDocument();
      expect(screen.getByText("Startup Inc")).toBeInTheDocument();
      expect(screen.getByText("45/100")).toBeInTheDocument();
    });
  });

  it("renders empty state when no resumes exist in Puter KV", async () => {
    mockKvList.mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <Workspace />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No Resumes in Workspace")).toBeInTheDocument();
      expect(
        screen.getByText("Upload your first PDF resume to begin using the AI optimization studio.")
      ).toBeInTheDocument();
    });

    const uploadButtons = screen.getAllByRole("link", { name: /Upload Resume|Upload New Resume/i });
    expect(uploadButtons.length).toBeGreaterThanOrEqual(1);
    expect(uploadButtons[0]).toHaveAttribute("href", "/upload");
  });

  it("filters resumes in real time by company name, job role, or file name", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <Workspace />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Senior Staff Engineer")).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText("Search workspace resumes");

    // Filter by company name "Stripe"
    act(() => {
      fireEvent.change(searchInput, { target: { value: "stripe" } });
    });

    expect(screen.getByText("Frontend Architect")).toBeInTheDocument();
    expect(screen.queryByText("Senior Staff Engineer")).not.toBeInTheDocument();
    expect(screen.queryByText("Junior Designer")).not.toBeInTheDocument();

    // Filter by role "Staff"
    act(() => {
      fireEvent.change(searchInput, { target: { value: "staff" } });
    });

    expect(screen.getByText("Senior Staff Engineer")).toBeInTheDocument();
    expect(screen.queryByText("Frontend Architect")).not.toBeInTheDocument();

    // Clear search using the clear button
    const clearButton = screen.getByLabelText("Clear search");
    act(() => {
      fireEvent.click(clearButton);
    });

    expect(screen.getByText("Senior Staff Engineer")).toBeInTheDocument();
    expect(screen.getByText("Frontend Architect")).toBeInTheDocument();
    expect(screen.getByText("Junior Designer")).toBeInTheDocument();
  });

  it("shows empty search feedback when no resumes match query and allows clearing", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <Workspace />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Senior Staff Engineer")).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText("Search workspace resumes");

    act(() => {
      fireEvent.change(searchInput, { target: { value: "nonexistent company" } });
    });

    expect(screen.getByText(/No resumes match/i)).toBeInTheDocument();
    expect(screen.getByText(/nonexistent company/i)).toBeInTheDocument();

    const clearButton = screen.getByRole("button", { name: /Clear filter/i });
    act(() => {
      fireEvent.click(clearButton);
    });

    expect(screen.getByText("Senior Staff Engineer")).toBeInTheDocument();
  });

  it("navigates to /resume/:id when a resume card is clicked", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <Workspace />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Senior Staff Engineer")).toBeInTheDocument();
    });

    const resumeLinks = screen.getAllByRole("link");
    const resumeLink = resumeLinks.find((link) => link.getAttribute("href") === "/resume/resume-1");
    expect(resumeLink).toBeDefined();
    expect(resumeLink).toHaveAttribute("href", "/resume/resume-1");
  });

  it("contains navigation links to /upload and /dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <Workspace />
      </MemoryRouter>
    );

    await waitFor(() => {
      const uploadLink = screen.getByRole("link", { name: /Upload New Resume/i });
      expect(uploadLink).toHaveAttribute("href", "/upload");

      const dashboardLink = screen.getByRole("link", { name: /View All on Dashboard/i });
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });
  });

  it("filters resumes by file name", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <Workspace />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Senior Staff Engineer")).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText("Search workspace resumes");

    act(() => {
      fireEvent.change(searchInput, { target: { value: "Designer_Resume" } });
    });

    expect(screen.getByText("Junior Designer")).toBeInTheDocument();
    expect(screen.queryByText("Senior Staff Engineer")).not.toBeInTheDocument();
    expect(screen.queryByText("Frontend Architect")).not.toBeInTheDocument();
  });

  it("reports error to telemetry if KV load fails", async () => {
    const trackErrorSpy = vi.spyOn(telemetry, "trackError");
    mockKvList.mockRejectedValueOnce(new Error("Puter KV cluster unreachable"));

    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <Workspace />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No Resumes in Workspace")).toBeInTheDocument();
      expect(trackErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ context: "workspace_load_resumes" })
      );
    });
  });
});
