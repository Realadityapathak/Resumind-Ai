import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import Home from "~/routes/home";
import Upload from "~/routes/upload";
import ResumeWorkspace from "~/routes/resume";
import Dashboard from "~/routes/dashboard";
import { usePuterStore } from "~/services/puter/store";
import {
  puterMock,
  resetPuterMock,
  DEFAULT_MOCK_USER,
} from "../mocks/puterMock";

// Mock PDF processing to ensure deterministic, fast execution in JSDOM
vi.mock("~/services/pdf/processPdfDocument", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/services/pdf/processPdfDocument")>();
  return {
    ...actual,
    processPdfDocument: vi.fn(async () => ({
      pages: [
        {
          pageNumber: 1,
          imageUrl: "blob:mock-page-1",
          file: new File(["page-1-bytes"], "resume_page_1.png", { type: "image/png" }),
          width: 1200,
          height: 1600,
          text: "Jane Doe\nPrincipal Systems Engineer\nSkills: Rust, Distributed Systems, Kafka, PostgreSQL.",
        },
        {
          pageNumber: 2,
          imageUrl: "blob:mock-page-2",
          file: new File(["page-2-bytes"], "resume_page_2.png", { type: "image/png" }),
          width: 1200,
          height: 1600,
          text: "Architected distributed transaction settlement platform handling $50M daily.\nLed zero-downtime database migration.",
        },
      ],
      pageCount: 2,
      fullText:
        "Jane Doe\nPrincipal Systems Engineer\nSkills: Rust, Distributed Systems, Kafka, PostgreSQL.\n\nArchitected distributed transaction settlement platform handling $50M daily.\nLed zero-downtime database migration.",
      pagesText: [
        "Jane Doe\nPrincipal Systems Engineer\nSkills: Rust, Distributed Systems, Kafka, PostgreSQL.",
        "Architected distributed transaction settlement platform handling $50M daily.\nLed zero-downtime database migration.",
      ],
      isScanned: false,
    })),
  };
});

describe("Tier 4: Comprehensive Opaque-Box E2E SaaS Workflow Integration Suite", () => {
  beforeAll(() => {
    // Polyfill SVGElement getTotalLength for SVG gauges
    if (typeof SVGElement !== "undefined" && !(SVGElement.prototype as any).getTotalLength) {
      (SVGElement.prototype as any).getTotalLength = () => 125.66;
    }

    // Polyfill navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    // Polyfill window.print
    window.print = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetPuterMock();

    (window as any).puter = puterMock;
    (globalThis as any).puter = puterMock;

    // Initialize Zustand store in unauthenticated state for landing page
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
      kv: {
        ...puterMock.kv,
        delete: (key: string) => puterMock.kv.del(key),
      },
      fs: puterMock.fs,
      ai: puterMock.ai,
    });
  });

  it("executes the full user journey: Landing -> AuthGuard -> Upload -> Scoring -> STAR -> Keywords -> Cover Letter -> Interview Prep -> Copilot -> Dashboard -> Atomic Deletion", async () => {
    // =========================================================================
    // STAGE 1: Public Landing Page & CTA Navigation
    // =========================================================================
    const { unmount: unmountLanding } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify Hero and value propositions
    const heroTitle = screen.getByRole("heading", { level: 1 });
    expect(heroTitle).toHaveTextContent(/Land/i);
    expect(heroTitle).toHaveTextContent(/3.2x More/i);

    // Verify 4 SaaS KPI Metrics
    expect(screen.getByTestId("metric-resumes")).toHaveTextContent("25,000+");
    expect(screen.getByTestId("metric-passrate")).toHaveTextContent("98%");
    expect(screen.getByTestId("metric-callbacks")).toHaveTextContent("3.2x");
    expect(screen.getByTestId("metric-latency")).toHaveTextContent("< 15s");

    // Verify Interactive Score Gauge Preview toggle
    expect(screen.getByText("92/100")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Before \(54\)/i }));
    expect(screen.getByText("54/100")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /After \(92\)/i }));
    expect(screen.getByText("92/100")).toBeInTheDocument();

    // Verify Primary CTA exists and targets /upload
    const ctaButton = screen.getByRole("link", { name: /Analyze Your Resume Free →/i });
    expect(ctaButton).toHaveAttribute("href", "/upload");

    unmountLanding();

    // =========================================================================
    // STAGE 1.5: AuthGuard Protection Verification
    // =========================================================================
    usePuterStore.setState({
      authStatus: "unauthenticated",
      auth: {
        ...usePuterStore.getState().auth,
        isAuthenticated: false,
        authStatus: "unauthenticated",
      },
    });

    const { unmount: unmountAuthCheck } = render(
      <MemoryRouter initialEntries={["/upload"]}>
        <Routes>
          <Route path="/upload" element={<Upload />} />
          <Route path="/auth" element={<div data-testid="auth-login-screen">Auth Gate</div>} />
        </Routes>
      </MemoryRouter>
    );

    // AuthGuard detects unauthenticated state and redirects to /auth?next=%2Fupload
    expect(await screen.findByTestId("auth-login-screen")).toBeInTheDocument();
    unmountAuthCheck();

    // Re-authenticate session for the remaining pipeline
    usePuterStore.setState({
      authStatus: "authenticated",
      auth: {
        ...usePuterStore.getState().auth,
        isAuthenticated: true,
        authStatus: "authenticated",
        user: DEFAULT_MOCK_USER,
      },
    });

    // =========================================================================
    // STAGE 2: Resume Upload & AI Analysis Pipeline
    // =========================================================================
    let generatedResumeId: string;

    const { container: uploadContainer, unmount: unmountUpload } = render(
      <MemoryRouter initialEntries={["/upload"]}>
        <Routes>
          <Route path="/upload" element={<Upload />} />
          <Route
            path="/resume/:id"
            element={
              <div data-testid="workspace-redirect-stub">
                Redirected to Workspace
              </div>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Smart feedback for your dream job")).toBeInTheDocument();

    // Fill metadata inputs
    const companyInput = uploadContainer.querySelector('input[name="company-name"]') as HTMLInputElement;
    const titleInput = uploadContainer.querySelector('input[name="job-title"]') as HTMLInputElement;
    const descInput = uploadContainer.querySelector('textarea[name="job-description"]') as HTMLTextAreaElement;
    const fileInput = uploadContainer.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(companyInput, { target: { value: "Acme Cloud Corp" } });
    fireEvent.change(titleInput, { target: { value: "Principal Systems Engineer" } });
    fireEvent.change(descInput, {
      target: {
        value: "Seeking a Principal Systems Engineer with expertise in Rust, Kubernetes, Distributed Systems, Kafka, and PostgreSQL.",
      },
    });

    const mockFile = new File(["%PDF-1.4 mock resume content"], "jane_doe_resume.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Verify file uploader acknowledged the file
    expect(await screen.findByText("jane_doe_resume.pdf")).toBeInTheDocument();

    // Submit form to trigger pipeline
    const analyzeButton = screen.getByRole("button", { name: /Analyze Resume/i });
    fireEvent.click(analyzeButton);

    // Wait for redirect to /resume/:id
    await waitFor(() => {
      expect(screen.getByTestId("workspace-redirect-stub")).toBeInTheDocument();
    });

    // Verify KV persistence occurred
    const allKvKeys = await puterMock.kv.list("resume:*", false);
    expect(allKvKeys.length).toBe(1);
    generatedResumeId = (allKvKeys[0] as string).replace("resume:", "");
    expect(generatedResumeId.length).toBeGreaterThan(0);

    // Verify atomic KV record schema
    const storedRecordRaw = await puterMock.kv.get(`resume:${generatedResumeId}`);
    expect(storedRecordRaw).not.toBeNull();
    const storedResume: Resume = JSON.parse(storedRecordRaw!);
    expect(storedResume.companyName).toBe("Acme Cloud Corp");
    expect(storedResume.jobTitle).toBe("Principal Systems Engineer");
    expect(storedResume.pageCount).toBe(2);
    expect(storedResume.feedback.overallScore).toBe(82);

    unmountUpload();

    // =========================================================================
    // STAGE 3 & 4: Dual-Pane Workspace & Overview Tab
    // =========================================================================
    const { unmount: unmountWorkspace } = render(
      <MemoryRouter initialEntries={[`/resume/${generatedResumeId}?tab=overview`]}>
        <Routes>
          <Route path="/resume/:id" element={<ResumeWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    // Header metadata verification
    expect(await screen.findByText("Principal Systems Engineer")).toBeInTheDocument();
    expect(screen.getByText("• Acme Cloud Corp")).toBeInTheDocument();
    expect(screen.getAllByText("82/100")[0]).toBeInTheDocument();

    // Left Pane: Document Previewer
    expect(screen.getByLabelText("Document Preview")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    // Plaintext / Visual Preview toggle
    const plaintextBtn = screen.getByRole("button", { name: /Plaintext/i });
    fireEvent.click(plaintextBtn);
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Principal Systems Engineer/i).length).toBeGreaterThanOrEqual(2);

    // Copy plain text
    const copyTextBtn = screen.getByRole("button", { name: /Copy All Text/i });
    fireEvent.click(copyTextBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Toggle back to Visual preview
    fireEvent.click(screen.getByRole("button", { name: /Visual Preview/i }));
    expect(screen.getByRole("img", { name: /Resume Page 1/i })).toBeInTheDocument();

    // Pagination verification: Next page
    const nextBtn = screen.getByRole("button", { name: /Next page/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    // Right Pane: Overview Tab
    expect(screen.getByLabelText("Resume Evaluation and Tools")).toBeInTheDocument();
    expect(screen.getByText(/ATS Evaluation/i)).toBeInTheDocument();
    expect(screen.getByText("Tone & Style")).toBeInTheDocument();
    expect(screen.getByText("Structure & Layout")).toBeInTheDocument();

    // =========================================================================
    // STAGE 5: Details / Deep Dive Tab
    // =========================================================================
    const detailsTab = screen.getByRole("tab", { name: /Deep Dive/i });
    fireEvent.click(detailsTab);

    expect(await screen.findByText("Comprehensive Quality Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Consistent professional tone.")).toBeInTheDocument();
    expect(screen.getByText("Quantified achievements present.")).toBeInTheDocument();

    // =========================================================================
    // STAGE 6: Keyword Gap Matrix Tab
    // =========================================================================
    const keywordTab = screen.getByRole("tab", { name: /Keyword Gap/i });
    fireEvent.click(keywordTab);

    // Initial state: click "Scan & Match Keywords"
    const analyzeKeywordsBtn = await screen.findByRole("button", { name: /Scan & Match Keywords/i });
    fireEvent.click(analyzeKeywordsBtn);

    // Verify AI Keyword Gap matrix matches
    await waitFor(() => {
      expect(screen.getByText("75%")).toBeInTheDocument(); // Match rate
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("Kubernetes")).toBeInTheDocument();
      expect(screen.getByText(/critical/i)).toBeInTheDocument();
    });

    // Verify KV persistence of Keyword Analysis
    const updatedRecordKeyword = JSON.parse((await puterMock.kv.get(`resume:${generatedResumeId}`))!);
    expect(updatedRecordKeyword.keywordAnalysis).toBeDefined();
    expect(updatedRecordKeyword.keywordAnalysis.matchRate).toBe(75);

    // =========================================================================
    // STAGE 7: STAR Bullet Rewriter Tab
    // =========================================================================
    const starTab = screen.getByRole("tab", { name: /STAR Rewriter/i });
    fireEvent.click(starTab);

    expect(await screen.findByText(/AI STAR Bullet Rewriter/i)).toBeInTheDocument();

    // Input bullet and trigger rewrite
    const bulletInput = screen.getByLabelText(/Original Bullet Point/i);
    fireEvent.change(bulletInput, {
      target: { value: "Overhauled database queries to improve speed." },
    });

    // Select Metrics & Scale tone pill
    const metricsTonePill = screen.getByRole("button", { name: /Metrics & Scale/i });
    fireEvent.click(metricsTonePill);

    const rewriteBtn = screen.getByRole("button", { name: /Transform with AI \(STAR Method\)/i });
    fireEvent.click(rewriteBtn);

    // Verify generated variants appear
    await waitFor(() => {
      expect(screen.getByText(/Spearheaded frontend performance optimizations/i)).toBeInTheDocument();
      expect(screen.getByText(/Accelerated web app transaction throughput/i)).toBeInTheDocument();
    });

    // Save chosen variant
    const saveButtons = screen.getAllByRole("button", { name: /^Save$/i });
    fireEvent.click(saveButtons[0]);

    // Verify saved badge / list
    await waitFor(() => {
      expect(screen.getByText(/Saved Rewrites/i)).toBeInTheDocument();
    });

    // Verify KV persistence of STAR rewrite
    const updatedRecordStar = JSON.parse((await puterMock.kv.get(`resume:${generatedResumeId}`))!);
    expect(updatedRecordStar.savedStarRewrites.length).toBe(1);

    // =========================================================================
    // STAGE 8: Tailored Cover Letter Tab
    // =========================================================================
    const coverLetterTab = screen.getByRole("tab", { name: /Cover Letter/i });
    fireEvent.click(coverLetterTab);

    expect(await screen.findByText("Tailored AI Cover Letter Generator")).toBeInTheDocument();

    // Select tone and generate
    const passionateToneBtn = screen.getByRole("button", { name: /Passionate/i });
    fireEvent.click(passionateToneBtn);

    const generateLetterBtn = screen.getByRole("button", { name: /Generate Tailored Letter/i });
    fireEvent.click(generateLetterBtn);

    // Verify generated letter preview and editor
    await waitFor(() => {
      expect(screen.getAllByText(/Application for Senior Full-Stack Engineer/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Dear Hiring Team at Stripe/i).length).toBeGreaterThanOrEqual(1);
    });

    // Live edit letter in textarea
    const letterEditor = screen.getByLabelText("Cover Letter Document Editor") as HTMLTextAreaElement;
    fireEvent.change(letterEditor, {
      target: { value: letterEditor.value + "\n\nPS: I am enthusiastic to meet the team!" },
    });

    // Test Clipboard Copy
    const copyLetterBtn = screen.getByRole("button", { name: /1-Click Copy/i });
    fireEvent.click(copyLetterBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Test Export / Print
    const exportBtn = screen.getByRole("button", { name: /Print \/ PDF/i });
    fireEvent.click(exportBtn);
    expect(window.print).toHaveBeenCalled();

    // Save draft
    const saveLetterBtn = screen.getByRole("button", { name: /Save Draft/i });
    fireEvent.click(saveLetterBtn);

    // Verify KV persistence of cover letter
    await waitFor(async () => {
      const updatedRecordCL = JSON.parse((await puterMock.kv.get(`resume:${generatedResumeId}`))!);
      expect(updatedRecordCL.coverLetters.length).toBe(1);
    });

    // =========================================================================
    // STAGE 9: Role-Specific Interview Prep Tab
    // =========================================================================
    const interviewTab = screen.getByRole("tab", { name: /Interview Prep/i });
    fireEvent.click(interviewTab);

    expect(await screen.findByText(/Interview Preparation Engine/i)).toBeInTheDocument();

    // Generate interview questions
    const generatePrepBtn = screen.getByRole("button", { name: /Generate 6-8 Questions/i });
    fireEvent.click(generatePrepBtn);

    // Verify question cards with Recruiter Intent and Resume Anchor
    await waitFor(() => {
      expect(screen.getByText(/Tell me about a time you had to balance technical debt/i)).toBeInTheDocument();
      expect(screen.getByText(/Evaluates pragmatic engineering judgment/i)).toBeInTheDocument();
    });

    // Toggle Bookmark
    const bookmarkButtons = screen.getAllByRole("button", { name: /Bookmark for Review/i });
    fireEvent.click(bookmarkButtons[0]);

    // Candidate Practice Scratchpad
    const scratchpadInput = screen.getByPlaceholderText(/Draft your own response here to rehearse before the interview/i);
    fireEvent.change(scratchpadInput, {
      target: { value: "In my previous role, I balanced urgent migration with customer releases." },
    });

    // Save Practice Response
    const saveDraftBtn = screen.getByRole("button", { name: /Save Draft/i });
    fireEvent.click(saveDraftBtn);

    // Verify KV persistence of interview prep
    await waitFor(async () => {
      const updatedRecordPrep = JSON.parse((await puterMock.kv.get(`resume:${generatedResumeId}`))!);
      expect(updatedRecordPrep.interviewPrep).toBeDefined();
      expect(updatedRecordPrep.interviewPrep.questions[0].isBookmarked).toBe(true);
      expect(updatedRecordPrep.interviewPrep.questions[0].userPracticeResponse).toContain("balanced urgent migration");
    });

    // =========================================================================
    // STAGE 10: Interactive AI Copilot & Action Engine Bridge Navigation
    // =========================================================================
    const copilotTab = screen.getByRole("tab", { name: /AI Copilot/i });
    fireEvent.click(copilotTab);

    // Context banner verification
    expect(await screen.findByTestId("copilot-context-status")).toHaveTextContent("Principal Systems Engineer");

    // Click Action Engine Bridge quick suggestion: "Optimize with STAR"
    const optimizeStarChip = screen.getByRole("button", { name: /Optimize with STAR/i });
    fireEvent.click(optimizeStarChip);

    // Verify Action Engine Bridge tab jump to STAR Rewriter
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /STAR Rewriter/i })).toHaveAttribute("aria-selected", "true");
    });

    unmountWorkspace();

    // =========================================================================
    // STAGE 11: Personal Dashboard & KPI Cards
    // =========================================================================
    const { unmount: unmountDashboard } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resume/:id" element={<ResumeWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify Dashboard displays evaluation record
    expect(await screen.findByText("Acme Cloud Corp")).toBeInTheDocument();
    expect(screen.getByText("Principal Systems Engineer")).toBeInTheDocument();

    // Verify KPI Statistics
    expect(screen.getByTestId("kpi-total-resumes")).toHaveTextContent("1");
    expect(screen.getByTestId("kpi-average-score")).toHaveTextContent("82");
    expect(screen.getByTestId("kpi-top-score")).toHaveTextContent("82");

    // Real-Time Search Query filtering
    const searchInput = screen.getByPlaceholderText(/Search by company, role, or keyword/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentCompany" } });
    expect(screen.getByText(/No evaluations matched your search criteria/i)).toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: "Acme" } });
    expect(screen.getByText("Acme Cloud Corp")).toBeInTheDocument();

    // Score Threshold Filtering (Strong > 70)
    const strongFilterBtn = screen.getByRole("button", { name: /Strong/i });
    fireEvent.click(strongFilterBtn);
    expect(screen.getByText("Acme Cloud Corp")).toBeInTheDocument();

    // View Mode Toggle: Table View
    const tableViewBtn = screen.getByRole("button", { name: /Table view/i });
    fireEvent.click(tableViewBtn);
    expect(screen.getByTestId("resumes-table-view")).toBeInTheDocument();

    // View Mode Toggle back to Grid View
    const gridViewBtn = screen.getByRole("button", { name: /Grid view/i });
    fireEvent.click(gridViewBtn);
    expect(screen.getByTestId("resumes-grid-view")).toBeInTheDocument();

    // =========================================================================
    // STAGE 12: Atomic Deletion Flow (KV + FS)
    // =========================================================================
    // Click Delete action button on the resume card
    const deleteButton = screen.getByTitle("Delete Evaluation");
    fireEvent.click(deleteButton);

    // Verify Modal Confirmation Dialog
    expect(await screen.findByText(/Are you sure you want to delete this evaluation\?/i)).toBeInTheDocument();
    expect(screen.getByText(/"Acme Cloud Corp"/i)).toBeInTheDocument();

    // Confirm deletion
    const confirmDeleteBtn = screen.getByRole("button", { name: /Confirm Delete/i });
    fireEvent.click(confirmDeleteBtn);

    // Verify success toast and state update
    await waitFor(() => {
      expect(screen.getByText(/deleted successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/No Resumes Evaluated Yet/i)).toBeInTheDocument();
    });

    // Verify KV deletion in Puter storage
    const remainingKv = await puterMock.kv.list("resume:*", false);
    expect(remainingKv.length).toBe(0);

    unmountDashboard();
  }, 30000);
});
