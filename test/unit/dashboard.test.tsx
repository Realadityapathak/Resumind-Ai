import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import Dashboard from "~/routes/dashboard";
import { puterMock, resetPuterMock, seedPuterKV, DEFAULT_MOCK_USER } from "../mocks/puterMock";
import { usePuterStore } from "~/services/puter/store";

const MOCK_RESUMES: Record<string, any> = {
  "resume:res-1": {
    id: "res-1",
    companyName: "Google",
    jobTitle: "Staff Software Engineer",
    imagePath: "resumes/img-1.png",
    resumePath: "resumes/doc-1.pdf",
    fileName: "google_staff_resume.pdf",
    fileSize: 102400,
    createdAt: "2026-11-01T10:00:00.000Z",
    feedback: {
      overallScore: 88,
      ATS: {
        score: 90,
        tips: [
          { type: "good", tip: "Great leadership keywords." },
          { type: "improve", tip: "Add distributed systems architecture metrics." },
        ],
      },
      toneAndStyle: { score: 85, tips: [] },
      content: { score: 90, tips: [] },
      structure: { score: 85, tips: [] },
      skills: { score: 85, tips: [] },
    },
  },
  "resume:res-2": {
    id: "res-2",
    companyName: "Stripe",
    jobTitle: "Frontend Architect",
    imagePath: "resumes/img-2.png",
    resumePath: "resumes/doc-2.pdf",
    fileName: "stripe_frontend.pdf",
    fileSize: 204800,
    createdAt: "2026-11-05T15:30:00.000Z",
    feedback: {
      overallScore: 62,
      ATS: {
        score: 65,
        tips: [
          { type: "improve", tip: "Missing TypeScript generics keywords." },
          { type: "improve", tip: "Specify payment API experience." },
        ],
      },
      toneAndStyle: { score: 60, tips: [] },
      content: { score: 60, tips: [] },
      structure: { score: 65, tips: [] },
      skills: { score: 60, tips: [] },
    },
  },
  "resume:res-3": {
    id: "res-3",
    companyName: "Amazon",
    jobTitle: "Cloud Engineer",
    imagePath: "resumes/img-3.png",
    resumePath: "resumes/doc-3.pdf",
    fileName: "amazon_cloud.pdf",
    fileSize: 153600,
    createdAt: "2026-10-20T08:15:00.000Z",
    feedback: {
      overallScore: 45,
      ATS: {
        score: 42,
        tips: [
          { type: "improve", tip: "Resume is missing core AWS certification keywords." },
        ],
      },
      toneAndStyle: { score: 50, tips: [] },
      content: { score: 40, tips: [] },
      structure: { score: 45, tips: [] },
      skills: { score: 45, tips: [] },
    },
  },
};

describe("Personal Dashboard Route (app/routes/dashboard.tsx)", () => {
  beforeEach(async () => {
    resetPuterMock();
    (window as any).puter = puterMock;
    (globalThis as any).puter = puterMock;

    // Seed mock files into in-memory FS
    await puterMock.fs.write("resumes/doc-1.pdf", "mock-pdf-content-1");
    await puterMock.fs.write("resumes/doc-2.pdf", "mock-pdf-content-2");
    await puterMock.fs.write("resumes/doc-3.pdf", "mock-pdf-content-3");
    await puterMock.fs.write("resumes/img-1.png", "mock-img-content-1");
    await puterMock.fs.write("resumes/img-2.png", "mock-img-content-2");
    await puterMock.fs.write("resumes/img-3.png", "mock-img-content-3");

    // Initialize Zustand puter store
    usePuterStore.setState({
      authStatus: "authenticated",
      puterReady: true,
      isLoading: false,
      auth: {
        user: DEFAULT_MOCK_USER,
        isAuthenticated: true,
        authStatus: "authenticated",
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        checkAuthStatus: vi.fn(async () => true),
        getUser: () => DEFAULT_MOCK_USER,
      },
      kv: {
        get: (key: string) => puterMock.kv.get(key),
        set: (key: string, value: string) => puterMock.kv.set(key, value),
        delete: (key: string) => puterMock.kv.del(key),
        list: (pattern: string, returnValues?: boolean) => puterMock.kv.list(pattern, returnValues),
        flush: () => puterMock.kv.flush(),
      },
      fs: {
        write: (path: string, data: any) => puterMock.fs.write(path, data),
        read: (path: string) => puterMock.fs.read(path),
        upload: (files: any) => puterMock.fs.upload(files),
        delete: (path: string) => puterMock.fs.delete(path),
        readDir: (path: string) => puterMock.fs.readdir(path),
      },
    });
  });

  it("1. renders all 4 KPI Stat Cards with correct calculated metrics", async () => {
    seedPuterKV(MOCK_RESUMES);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Wait for resumes to load from Puter KV
    await waitFor(() => {
      expect(screen.getByText("Google")).toBeInTheDocument();
    });

    // KPI 1: Total Evaluated = 3
    expect(screen.getByTestId("kpi-total-resumes")).toHaveTextContent("3");

    // KPI 2: Average Score = round((88 + 62 + 45) / 3) = 65
    expect(screen.getByTestId("kpi-average-score")).toHaveTextContent("65");

    // KPI 3: Best Score = 88 (Google)
    expect(screen.getByTestId("kpi-top-score")).toHaveTextContent("88");

    // KPI 4: High Priority Action Items count = 1 + 2 + 1 = 4
    expect(screen.getByTestId("kpi-action-items")).toHaveTextContent("4");
  });

  it("2. filters evaluations in real-time by search query matching company name, job role, and ATS tips", async () => {
    seedPuterKV(MOCK_RESUMES);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Google")).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/search by company, role, or keyword/i);

    // Search by company
    await user.type(searchInput, "Stripe");
    expect(screen.getByText("Stripe")).toBeInTheDocument();
    expect(screen.queryByText("Google")).not.toBeInTheDocument();
    expect(screen.queryByText("Amazon")).not.toBeInTheDocument();

    // Clear search
    await user.clear(searchInput);
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("Amazon")).toBeInTheDocument();

    // Search by ATS tip text ("AWS certification")
    await user.type(searchInput, "AWS certification");
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.queryByText("Google")).not.toBeInTheDocument();
    expect(screen.queryByText("Stripe")).not.toBeInTheDocument();
  });

  it("3. filters evaluations by score tier chips (Strong, Good Start, Needs Work)", async () => {
    seedPuterKV(MOCK_RESUMES);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Google")).toBeInTheDocument());

    // Filter by Strong (>70) -> Only Google (88)
    const strongChip = screen.getByRole("button", { name: /strong/i });
    fireEvent.click(strongChip);

    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.queryByText("Stripe")).not.toBeInTheDocument();
    expect(screen.queryByText("Amazon")).not.toBeInTheDocument();

    // Filter by Good Start (50-70) -> Only Stripe (62)
    const moderateChip = screen.getByRole("button", { name: /good start/i });
    fireEvent.click(moderateChip);

    expect(screen.getByText("Stripe")).toBeInTheDocument();
    expect(screen.queryByText("Google")).not.toBeInTheDocument();
    expect(screen.queryByText("Amazon")).not.toBeInTheDocument();

    // Filter by Needs Work (<50) -> Only Amazon (45)
    const weakChip = screen.getByRole("button", { name: /needs work/i });
    fireEvent.click(weakChip);

    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.queryByText("Google")).not.toBeInTheDocument();
    expect(screen.queryByText("Stripe")).not.toBeInTheDocument();
  });

  it("4. sorts evaluations correctly by Newest, Score High-to-Low, and Company A-Z", async () => {
    seedPuterKV(MOCK_RESUMES);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Google")).toBeInTheDocument());

    const sortSelect = screen.getByLabelText(/sort by/i);

    // Sort by Score High to Low
    fireEvent.change(sortSelect, { target: { value: "score_desc" } });
    let cards = screen.getAllByTestId("resume-item-title");
    expect(cards[0]).toHaveTextContent("Google"); // 88
    expect(cards[1]).toHaveTextContent("Stripe"); // 62
    expect(cards[2]).toHaveTextContent("Amazon"); // 45

    // Sort by Score Low to High
    fireEvent.change(sortSelect, { target: { value: "score_asc" } });
    cards = screen.getAllByTestId("resume-item-title");
    expect(cards[0]).toHaveTextContent("Amazon"); // 45
    expect(cards[1]).toHaveTextContent("Stripe"); // 62
    expect(cards[2]).toHaveTextContent("Google"); // 88

    // Sort by Company A-Z
    fireEvent.change(sortSelect, { target: { value: "company_asc" } });
    cards = screen.getAllByTestId("resume-item-title");
    expect(cards[0]).toHaveTextContent("Amazon");
    expect(cards[1]).toHaveTextContent("Google");
    expect(cards[2]).toHaveTextContent("Stripe");
  });

  it("5. toggles cleanly between Grid View and Table View", async () => {
    seedPuterKV(MOCK_RESUMES);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Google")).toBeInTheDocument());

    // By default: Grid view
    expect(screen.getByTestId("resumes-grid-view")).toBeInTheDocument();
    expect(screen.queryByTestId("resumes-table-view")).not.toBeInTheDocument();

    // Toggle to Table view
    const tableToggleBtn = screen.getByRole("button", { name: /table view/i });
    fireEvent.click(tableToggleBtn);

    expect(screen.queryByTestId("resumes-grid-view")).not.toBeInTheDocument();
    expect(screen.getByTestId("resumes-table-view")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Staff Software Engineer")).toBeInTheDocument();
  });

  it("6. opens delete confirmation modal and cancels without deleting", async () => {
    seedPuterKV(MOCK_RESUMES);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Google")).toBeInTheDocument());

    // Click delete on Google card
    const deleteBtn = screen.getByTestId("delete-btn-res-1");
    fireEvent.click(deleteBtn);

    // Modal appears
    const modal = screen.getByRole("dialog");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Google/i)).toBeInTheDocument();

    // Click Cancel
    const cancelBtn = within(modal).getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);

    // Modal closed, Google still exists
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(puterMock.kvStore.has("resume:res-1")).toBe(true);
  });

  it("7. executes atomic deletion: removes from Puter KV AND calls fs.delete for PDF and image", async () => {
    seedPuterKV(MOCK_RESUMES);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Google")).toBeInTheDocument());

    const deleteBtn = screen.getByTestId("delete-btn-res-1");
    fireEvent.click(deleteBtn);

    const modal = screen.getByRole("dialog");
    const confirmBtn = within(modal).getByRole("button", { name: /confirm delete/i });

    // Confirm deletion
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText("Google")).not.toBeInTheDocument();
    });

    // Verify atomic KV deletion
    expect(puterMock.kvStore.has("resume:res-1")).toBe(false);

    // Verify atomic FS deletion
    expect(puterMock.fs.delete).toHaveBeenCalledWith("resumes/doc-1.pdf");
    expect(puterMock.fs.delete).toHaveBeenCalledWith("resumes/img-1.png");

    // Remaining resumes still exist
    expect(screen.getByText("Stripe")).toBeInTheDocument();
    expect(screen.getByText("Amazon")).toBeInTheDocument();
  });

  it("8. renders empty state with primary CTA linking to /upload when no resumes exist", async () => {
    seedPuterKV({}); // Empty KV store

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no resumes evaluated yet/i)).toBeInTheDocument();
    });

    const ctaBtns = screen.getAllByRole("link", { name: /upload resume/i });
    expect(ctaBtns.length).toBeGreaterThan(0);
    expect(ctaBtns[0]).toHaveAttribute("href", "/upload");
    expect(screen.getByTestId("kpi-total-resumes")).toHaveTextContent("0");
  });

  it("9. triggers PDF download from Puter FS on Download action", async () => {
    seedPuterKV(MOCK_RESUMES);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Google")).toBeInTheDocument());

    const downloadBtn = screen.getByTestId("download-btn-res-1");
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(puterMock.fs.read).toHaveBeenCalledWith("resumes/doc-1.pdf");
    });
  });

  it("10. [Adversarial] handles search queries with regex special characters without crashing", async () => {
    const SPECIAL_RESUMES = {
      ...MOCK_RESUMES,
      "resume:res-special": {
        id: "res-special",
        companyName: "C++ (Systems) [Remote] *Core*",
        jobTitle: "Senior Architect + Lead \\ Engineer",
        imagePath: "resumes/img-spec.png",
        resumePath: "resumes/doc-spec.pdf",
        fileName: "special_chars.pdf",
        fileSize: 100000,
        createdAt: "2026-11-06T12:00:00.000Z",
        feedback: {
          overallScore: 95,
          ATS: {
            score: 95,
            tips: [{ type: "good", tip: "Strong regex/parser matching skills (C++)." }],
          },
          toneAndStyle: { score: 90, tips: [] },
          content: { score: 90, tips: [] },
          structure: { score: 90, tips: [] },
          skills: { score: 95, tips: [] },
        },
      },
    };
    seedPuterKV(SPECIAL_RESUMES);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Google")).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/search by company, role, or keyword/i);

    // List of regex special characters to test
    const adversarialQueries = ["(", "[", "*", "+", "\\", ".*", "(?", ")+", "[a-z]+", "[[[", "\\\\"];

    for (const q of adversarialQueries) {
      fireEvent.change(searchInput, { target: { value: q } });
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    }

    // Specifically test that searching for '(' matches 'C++ (Systems) [Remote] *Core*'
    fireEvent.change(searchInput, { target: { value: "(" } });
    expect(screen.getByText("C++ (Systems) [Remote] *Core*")).toBeInTheDocument();
    expect(screen.queryByText("Google")).not.toBeInTheDocument();

    // Specifically test that searching for '+' matches 'C++ (Systems) [Remote] *Core*'
    fireEvent.change(searchInput, { target: { value: "+" } });
    expect(screen.getByText("C++ (Systems) [Remote] *Core*")).toBeInTheDocument();

    // Specifically test that searching for '[' matches
    fireEvent.change(searchInput, { target: { value: "[" } });
    expect(screen.getByText("C++ (Systems) [Remote] *Core*")).toBeInTheDocument();

    // Specifically test that searching for '*' matches
    fireEvent.change(searchInput, { target: { value: "*" } });
    expect(screen.getByText("C++ (Systems) [Remote] *Core*")).toBeInTheDocument();

    // Specifically test that searching for '\' matches
    fireEvent.change(searchInput, { target: { value: "\\" } });
    expect(screen.getByText("C++ (Systems) [Remote] *Core*")).toBeInTheDocument();
  });

  it("11. [Adversarial] safely handles legacy resumes missing createdAt, updatedAt, fileName, and companyName", async () => {
    const LEGACY_RESUMES: Record<string, any> = {
      "resume:leg-1": {
        id: "leg-1",
        // missing companyName, jobTitle, createdAt, updatedAt, fileName, resumePath, imagePath
        feedback: {
          overallScore: 78,
          // missing ATS
        },
      },
      "resume:leg-2": {
        id: "leg-2",
        companyName: null,
        jobTitle: "Contract Specialist",
        createdAt: null,
        updatedAt: null,
        fileName: null,
        resumePath: null,
        imagePath: null,
        feedback: {
          overallScore: 40,
          ATS: {
            score: 40,
            tips: null,
          },
        },
      },
    };
    seedPuterKV(LEGACY_RESUMES);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Should render without null reference exceptions
    await waitFor(() => {
      // leg-1 has no companyName or jobTitle, falls back to "Uploaded Resume"
      expect(screen.getByText("Uploaded Resume")).toBeInTheDocument();
    });
    // leg-2 falls back to jobTitle "Contract Specialist" (may appear in heading and role)
    expect(screen.getAllByText("Contract Specialist").length).toBeGreaterThan(0);

    // KPI cards render without throwing
    expect(screen.getByTestId("kpi-total-resumes")).toHaveTextContent("2");
    expect(screen.getByTestId("kpi-average-score")).toHaveTextContent("59");
    expect(screen.getByTestId("kpi-top-score")).toHaveTextContent("78");
    expect(screen.getByTestId("kpi-action-items")).toHaveTextContent("0");

    // Test all sorting options with null/missing fields
    const sortSelect = screen.getByLabelText(/sort by/i);
    const sortModes = ["newest", "oldest", "score_desc", "score_asc", "company_asc"] as const;

    for (const mode of sortModes) {
      fireEvent.change(sortSelect, { target: { value: mode } });
      const titles = screen.getAllByTestId("resume-item-title");
      expect(titles.length).toBe(2);
    }

    // Toggle to Table View with legacy records
    const tableToggleBtn = screen.getByRole("button", { name: /table view/i });
    fireEvent.click(tableToggleBtn);

    expect(screen.getByTestId("resumes-table-view")).toBeInTheDocument();
    expect(screen.getAllByText("Saved").length).toBeGreaterThan(0);

    // Delete legacy resume without resumePath/imagePath
    const deleteBtn = screen.getByTestId("delete-btn-leg-1");
    fireEvent.click(deleteBtn);

    const modal = screen.getByRole("dialog");
    const confirmBtn = within(modal).getByRole("button", { name: /confirm delete/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText("Uploaded Resume")).not.toBeInTheDocument();
    });
    expect(puterMock.kvStore.has("resume:leg-1")).toBe(false);
  });

  it("12. [Adversarial] retains the KV record when Puter FS deletion fails, then succeeds on retry", async () => {
    const PARTIAL_RESUMES: Record<string, any> = {
      "resume:part-1": {
        id: "part-1",
        companyName: "Partial Inc",
        jobTitle: "DevOps",
        resumePath: "resumes/doc-part.pdf",
        imagePath: null,
        feedback: { overallScore: 70 },
      },
    };
    seedPuterKV(PARTIAL_RESUMES);

    const fsDeleteMock = vi.fn().mockRejectedValue(new Error("Puter FS disk quota exceeded"));
    usePuterStore.setState({
      fs: {
        ...usePuterStore.getState().fs,
        delete: fsDeleteMock,
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Partial Inc")).toBeInTheDocument());

    const deleteBtn = screen.getByTestId("delete-btn-part-1");
    fireEvent.click(deleteBtn);

    const modal = screen.getByRole("dialog");
    const confirmBtn = within(modal).getByRole("button", { name: /confirm delete/i });
    fireEvent.click(confirmBtn);

    // File cleanup failed, so the KV record and visible resume must be retained for retry.
    await waitFor(() => {
      expect(screen.getByText(/could not delete.*files could not be removed/i)).toBeInTheDocument();
    });
    expect(puterMock.kvStore.has("resume:part-1")).toBe(true);
    expect(screen.getByText("Partial Inc")).toBeInTheDocument();
    expect(fsDeleteMock).toHaveBeenCalledWith("resumes/doc-part.pdf");
    expect(fsDeleteMock).not.toHaveBeenCalledWith(null);

    // Retry after the filesystem recovers: KV is only removed once files succeed.
    fsDeleteMock.mockResolvedValue(undefined);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText("Partial Inc")).not.toBeInTheDocument();
    });
    expect(puterMock.kvStore.has("resume:part-1")).toBe(false);
  });

  it("13. deletes every imagePaths entry before removing the KV record", async () => {
    seedPuterKV({
      "resume:multi-1": {
        id: "multi-1",
        companyName: "Multi Page Co",
        jobTitle: "Platform Engineer",
        resumePath: "resumes/multi.pdf",
        imagePath: "resumes/page-1.png",
        imagePaths: ["resumes/page-1.png", "resumes/page-2.png", "resumes/page-3.png"],
        feedback: { overallScore: 79 },
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Multi Page Co")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("delete-btn-multi-1"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /confirm delete/i }));

    await waitFor(() => {
      expect(screen.queryByText("Multi Page Co")).not.toBeInTheDocument();
    });

    expect(puterMock.fs.delete).toHaveBeenCalledWith("resumes/multi.pdf");
    expect(puterMock.fs.delete).toHaveBeenCalledWith("resumes/page-1.png");
    expect(puterMock.fs.delete).toHaveBeenCalledWith("resumes/page-2.png");
    expect(puterMock.fs.delete).toHaveBeenCalledWith("resumes/page-3.png");
    // page-1 is both imagePath and imagePaths[0], but must only be deleted once.
    expect(puterMock.fs.delete).toHaveBeenCalledTimes(4);
    expect(puterMock.kvStore.has("resume:multi-1")).toBe(false);
  });

  it("14. treats a KV key already deleted elsewhere as an idempotent success", async () => {
    seedPuterKV({
      "resume:ghost-1": {
        id: "ghost-1",
        companyName: "Ghost Corp",
        jobTitle: "Platform Lead",
        resumePath: "resumes/ghost.pdf",
        imagePath: "resumes/ghost.png",
        feedback: { overallScore: 73 },
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Ghost Corp")).toBeInTheDocument());

    // Another session deletes the KV record before the user confirms the modal.
    await puterMock.kv.del("resume:ghost-1");

    fireEvent.click(screen.getByTestId("delete-btn-ghost-1"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /confirm delete/i }));

    await waitFor(() => {
      expect(screen.getByText(/deleted successfully/i)).toBeInTheDocument();
      expect(screen.queryByText("Ghost Corp")).not.toBeInTheDocument();
    });
    expect(puterMock.kvStore.has("resume:ghost-1")).toBe(false);
  });

  it("15. retains the resume when KV deletion returns false but the key still exists", async () => {
    seedPuterKV({
      "resume:stuck-1": {
        id: "stuck-1",
        companyName: "Stuck Corp",
        jobTitle: "Systems Engineer",
        resumePath: "resumes/stuck.pdf",
        imagePath: "resumes/stuck.png",
        feedback: { overallScore: 68 },
      },
    });

    usePuterStore.setState({
      kv: {
        ...usePuterStore.getState().kv,
        delete: vi.fn(async () => false),
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Stuck Corp")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("delete-btn-stuck-1"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /confirm delete/i }));

    await waitFor(() => {
      expect(screen.getByText(/cloud record could not be removed/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Stuck Corp")).toBeInTheDocument();
    expect(puterMock.kvStore.has("resume:stuck-1")).toBe(true);
  });
});
