import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import Upload from "~/routes/upload";
import ResumeWorkspace from "~/routes/resume";
import Dashboard from "~/routes/dashboard";
import { usePuterStore } from "~/services/puter/store";
import type { PdfProcessResult } from "~/services/pdf/processPdfDocument";
import {
  puterMock,
  resetPuterMock,
  DEFAULT_MOCK_USER,
  DEFAULT_AI_FEEDBACK_DATA,
} from "../mocks/puterMock";

type CustomPdfResult =
  | PdfProcessResult
  | ((file: File) => PdfProcessResult | Promise<PdfProcessResult>);

// Controllable PDF extraction mock for adversarial scenarios
let customPdfResult: CustomPdfResult | null = null;

vi.mock("~/services/pdf/processPdfDocument", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/services/pdf/processPdfDocument")>();
  return {
    ...actual,
    processPdfDocument: vi.fn(async (file: File) => {
      if (customPdfResult) {
        return typeof customPdfResult === "function" ? customPdfResult(file) : customPdfResult;
      }
      return {
        pages: [
          {
            pageNumber: 1,
            imageUrl: "blob:mock-adversarial-p1",
            file: new File(["page-1-bytes"], "resume_p1.png", { type: "image/png" }),
            width: 1200,
            height: 1600,
            text: "Jane Doe\nPrincipal Architect\nSkills: Distributed Systems, Rust, Kafka, PostgreSQL.",
          },
        ],
        pageCount: 1,
        fullText: "Jane Doe\nPrincipal Architect\nSkills: Distributed Systems, Rust, Kafka, PostgreSQL.",
        pagesText: ["Jane Doe\nPrincipal Architect\nSkills: Distributed Systems, Rust, Kafka, PostgreSQL."],
        isScanned: false,
      };
    }),
  };
});

describe("Adversarial E2E Workflow, Route Protection & State Transition Suite", () => {
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

  beforeEach(async () => {
    vi.clearAllMocks();
    resetPuterMock();
    customPdfResult = null;

    (window as any).puter = puterMock;
    (globalThis as any).puter = puterMock;

    // Seed mock files into Puter FS for test workspace instances
    await puterMock.fs.write("mock/res.pdf", new Blob(["%PDF-1.4 mock content"], { type: "application/pdf" }));
    await puterMock.fs.write("mock/p1.png", new Blob(["mock png content"], { type: "image/png" }));

    // Default to authenticated session with in-memory Puter services
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
        ...puterMock.kv,
        delete: (key: string) => puterMock.kv.del(key),
      },
      fs: puterMock.fs,
      ai: puterMock.ai,
    });
  });

  // =========================================================================
  // 1. Empty, Corrupt, or Non-English Resume Text Extractions
  // =========================================================================
  describe("1. Empty, Corrupt & Non-English Resume Text Extractions", () => {
    it("rejects corrupt or unreadable PDF extraction without polluting Puter KV", async () => {
      // Simulate corrupt PDF header
      customPdfResult = {
        pages: [],
        pageCount: 0,
        fullText: "",
        pagesText: [],
        error: "Corrupted PDF header or damaged xref stream",
        isScanned: false,
      };

      const { container, unmount } = render(
        <MemoryRouter initialEntries={["/upload"]}>
          <Routes>
            <Route path="/upload" element={<Upload />} />
            <Route path="/resume/:id" element={<div data-testid="workspace-stub">Workspace</div>} />
          </Routes>
        </MemoryRouter>
      );

      const companyInput = container.querySelector('input[name="company-name"]') as HTMLInputElement;
      const titleInput = container.querySelector('input[name="job-title"]') as HTMLInputElement;
      const descInput = container.querySelector('textarea[name="job-description"]') as HTMLTextAreaElement;
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(companyInput, { target: { value: "Broken Inc" } });
      fireEvent.change(titleInput, { target: { value: "Site Reliability Engineer" } });
      fireEvent.change(descInput, { target: { value: "Seeking SRE with Kubernetes and cloud infrastructure experience." } });

      const corruptFile = new File(["not a pdf content"], "corrupt.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [corruptFile] } });
      await waitFor(() => {
        expect(screen.getByText("corrupt.pdf")).toBeInTheDocument();
      }, { timeout: 10000 });

      const analyzeBtn = screen.getByRole("button", { name: /Analyze Resume/i });
      fireEvent.click(analyzeBtn);

      // Verify that upload pipeline rejected corrupt document:
      // Form button remains visible/stable, no redirect to workspace occurs
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Analyze Resume/i })).toBeInTheDocument();
        expect(screen.queryByTestId("workspace-stub")).not.toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify atomic guarantee: zero resumes saved in Puter KV
      const savedKeys = await puterMock.kv.list("resume:*", false);
      expect(savedKeys.length).toBe(0);

      unmount();
    }, 15000);

    it("handles scanned PDF with empty OCR output gracefully in both upload and workspace", async () => {
      // Simulate scanned PDF where OCR engine returns an empty string
      customPdfResult = {
        pages: [
          {
            pageNumber: 1,
            imageUrl: "blob:mock-scanned-page",
            file: new File(["scanned-bytes"], "scanned_p1.png", { type: "image/png" }),
            width: 1200,
            height: 1600,
            text: "",
          },
        ],
        pageCount: 1,
        fullText: "",
        pagesText: [""],
        isScanned: true,
      };

      // Mock ai.img2txt returning empty string
      puterMock.ai.img2txt = vi.fn().mockResolvedValue("");

      const { container, unmount } = render(
        <MemoryRouter initialEntries={["/upload"]}>
          <Routes>
            <Route path="/upload" element={<Upload />} />
            <Route path="/resume/:id" element={<div data-testid="workspace-redirect-scanned">Workspace</div>} />
          </Routes>
        </MemoryRouter>
      );

      const companyInput = container.querySelector('input[name="company-name"]') as HTMLInputElement;
      const titleInput = container.querySelector('input[name="job-title"]') as HTMLInputElement;
      const descInput = container.querySelector('textarea[name="job-description"]') as HTMLTextAreaElement;
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(companyInput, { target: { value: "ImageScan Corp" } });
      fireEvent.change(titleInput, { target: { value: "Data Architect" } });
      fireEvent.change(descInput, { target: { value: "Looking for an architect with SQL and data warehousing skills." } });

      const scannedFile = new File(["scanned-pdf-bytes"], "scanned_resume.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [scannedFile] } });
      await waitFor(() => {
        expect(screen.getByText("scanned_resume.pdf")).toBeInTheDocument();
      }, { timeout: 10000 });

      const analyzeBtn = screen.getByRole("button", { name: /Analyze Resume/i });
      fireEvent.click(analyzeBtn);

      // Pipeline continues despite empty OCR text and redirects
      await waitFor(() => {
        expect(screen.getByTestId("workspace-redirect-scanned")).toBeInTheDocument();
      }, { timeout: 10000 });

      // Check saved record flags
      const keys = await puterMock.kv.list("resume:*", false);
      expect(keys.length).toBe(1);
      const resumeId = (keys[0] as string).replace("resume:", "");
      const savedRaw = await puterMock.kv.get(`resume:${resumeId}`);
      const savedRecord: Resume = JSON.parse(savedRaw!);
      expect(savedRecord.isScanned).toBe(true);
      expect(savedRecord.ocrApplied).toBe(false);
      expect(savedRecord.parsedText).toBe("");

      unmount();

      // Now verify Workspace renders Plaintext view without throwing on empty text
      const { unmount: unmountWs } = render(
        <MemoryRouter initialEntries={[`/resume/${resumeId}?tab=overview`]}>
          <Routes>
            <Route path="/resume/:id" element={<ResumeWorkspace />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText("Data Architect", {}, { timeout: 10000 })).toBeInTheDocument();
      const plaintextBtn = screen.getByRole("button", { name: /Plaintext/i });
      fireEvent.click(plaintextBtn);

      // Workspace displays fallback message for empty document text and scanned document badge
      expect(screen.getByText(/No plaintext layer extracted from this document/i)).toBeInTheDocument();
      expect(screen.getByText(/Scanned Document/i)).toBeInTheDocument();

      unmountWs();
    }, 20000);

    it("preserves international Unicode, CJK, Arabic RTL, and Emoji characters during extraction and workspace display", async () => {
      const multilingualText =
        "张伟 - Senior Distributed Systems Engineer\n" +
        "Université Paris-Saclay: Ingénieur diplômé (Mention Très Honorable)\n" +
        "خبير أنظمة سحابية (Cloud Systems Expert)\n" +
        "Skills: 机器学习 (ML), Python, C++, Rust, 日本語対応 🇯🇵\n" +
        "Achievements: Scaled high-throughput ledger handling ∀x ∈ Transactions (100k TPS 🚀🔥).";

      customPdfResult = {
        pages: [
          {
            pageNumber: 1,
            imageUrl: "blob:mock-unicode-page",
            file: new File(["unicode-bytes"], "unicode_p1.png", { type: "image/png" }),
            width: 1200,
            height: 1600,
            text: multilingualText,
          },
        ],
        pageCount: 1,
        fullText: multilingualText,
        pagesText: [multilingualText],
        isScanned: false,
      };

      const { container, unmount } = render(
        <MemoryRouter initialEntries={["/upload"]}>
          <Routes>
            <Route path="/upload" element={<Upload />} />
            <Route path="/resume/:id" element={<div data-testid="workspace-redirect-unicode">Redirected</div>} />
          </Routes>
        </MemoryRouter>
      );

      const companyInput = container.querySelector('input[name="company-name"]') as HTMLInputElement;
      const titleInput = container.querySelector('input[name="job-title"]') as HTMLInputElement;
      const descInput = container.querySelector('textarea[name="job-description"]') as HTMLTextAreaElement;
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(companyInput, { target: { value: "Global AI Tech (全球人工智能)" } });
      fireEvent.change(titleInput, { target: { value: "Senior Systems Engineer (高级工程师)" } });
      fireEvent.change(descInput, { target: { value: "Multilingual systems engineering role requiring high concurrency experience." } });

      const unicodeFile = new File(["multilingual-bytes"], "unicode_resume.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [unicodeFile] } });
      await waitFor(() => {
        expect(screen.getByText("unicode_resume.pdf")).toBeInTheDocument();
      }, { timeout: 10000 });

      fireEvent.click(screen.getByRole("button", { name: /Analyze Resume/i }));

      await waitFor(() => {
        expect(screen.getByTestId("workspace-redirect-unicode")).toBeInTheDocument();
      }, { timeout: 10000 });

      const keys = await puterMock.kv.list("resume:*", false);
      const resumeId = (keys[0] as string).replace("resume:", "");
      unmount();

      // Render in Workspace and verify Unicode preservation in Plaintext preview
      const { unmount: unmountWs } = render(
        <MemoryRouter initialEntries={[`/resume/${resumeId}?tab=overview`]}>
          <Routes>
            <Route path="/resume/:id" element={<ResumeWorkspace />} />
          </Routes>
        </MemoryRouter>
      );

      const titles = await screen.findAllByText(/Senior Systems Engineer/i, {}, { timeout: 10000 });
      expect(titles.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Global AI Tech/i).length).toBeGreaterThanOrEqual(1);
      fireEvent.click(screen.getByRole("button", { name: /Plaintext/i }));

      // Verify Chinese, Arabic, French, Math symbol, and Emojis are intact
      expect(screen.getByText(/张伟/i)).toBeInTheDocument();
      expect(screen.getByText(/Ingénieur diplômé/i)).toBeInTheDocument();
      expect(screen.getByText(/خبير أنظمة سحابية/i)).toBeInTheDocument();
      expect(screen.getByText(/∀x ∈ Transactions/i)).toBeInTheDocument();
      expect(screen.getByText(/100k TPS 🚀🔥/i)).toBeInTheDocument();

      unmountWs();
    }, 20000);
  });

  // =========================================================================
  // 2. Malformed or Oversized Job Descriptions During Keyword Analysis
  // =========================================================================
  describe("2. Malformed or Oversized Job Descriptions in Keyword Analysis", () => {
    it("enforces minimum length constraints and resists empty or whitespace-only job descriptions", async () => {
      const testResumeId = "adversarial-short-jd-test";
      const testResume: Resume = {
        id: testResumeId,
        companyName: "Boundary Corp",
        jobTitle: "Software Engineer",
        jobDescription: "",
        imagePath: "mock/p1.png",
        resumePath: "mock/res.pdf",
        parsedText: "Software Engineer with React and TypeScript experience.",
        pageCount: 1,
        feedback: DEFAULT_AI_FEEDBACK_DATA as Feedback,
      };
      await puterMock.kv.set(`resume:${testResumeId}`, JSON.stringify(testResume));

      const { unmount } = render(
        <MemoryRouter initialEntries={[`/resume/${testResumeId}?tab=keywords`]}>
          <Routes>
            <Route path="/resume/:id" element={<ResumeWorkspace />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText(/ATS Keyword Gap Matrix/i)).toBeInTheDocument();

      const jdTextarea = screen.getByLabelText(/Target Job Description/i) as HTMLTextAreaElement;
      const scanButton = screen.getByRole("button", { name: /Scan & Match Keywords/i });

      // Empty input -> Scan button disabled
      expect(scanButton).toBeDisabled();

      // 19 characters (< 20 minimum) -> Scan button remains disabled
      fireEvent.change(jdTextarea, { target: { value: "1234567890123456789" } });
      expect(scanButton).toBeDisabled();

      // Exactly 20 characters -> Scan button enables
      fireEvent.change(jdTextarea, { target: { value: "12345678901234567890" } });
      expect(scanButton).not.toBeDisabled();

      unmount();
    }, 15000);

    it("survives massive 25,000+ char adversarial job description with XSS vectors and special characters (C++, C#, .NET)", async () => {
      const testResumeId = "adversarial-massive-jd-test";
      const resumeContent = "Experienced Developer with C++, C#, .NET Core, Kubernetes, Rust, Docker, Kafka.";
      const testResume: Resume = {
        id: testResumeId,
        companyName: "Enterprise Giant",
        jobTitle: "Systems Architect",
        jobDescription: "Initial short JD",
        imagePath: "mock/p1.png",
        resumePath: "mock/res.pdf",
        parsedText: resumeContent,
        pageCount: 1,
        feedback: DEFAULT_AI_FEEDBACK_DATA as Feedback,
      };
      await puterMock.kv.set(`resume:${testResumeId}`, JSON.stringify(testResume));

      // Construct 25,000+ character adversarial payload
      const hostilePrefix =
        "<script id='adversarial-xss'>window.__PWNED_KEYWORD__ = true;</script>" +
        "<img src='invalid-image' onerror='alert(\"XSS\")' />" +
        "Requirements: Must possess deep experience in C++, C#, .NET, and Kubernetes. ";
      const massiveJobDescription = hostilePrefix + "Responsibilities: High performance distributed computing. ".repeat(600);
      expect(massiveJobDescription.length).toBeGreaterThan(25000);

      const { unmount } = render(
        <MemoryRouter initialEntries={[`/resume/${testResumeId}?tab=keywords`]}>
          <Routes>
            <Route path="/resume/:id" element={<ResumeWorkspace />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText(/ATS Keyword Gap Matrix/i)).toBeInTheDocument();

      // JD editor is open by default when no initialKeywordAnalysis is present
      const jdTextarea = screen.getByLabelText(/Target Job Description/i) as HTMLTextAreaElement;
      fireEvent.change(jdTextarea, { target: { value: massiveJobDescription } });

      const scanButton = screen.getByRole("button", { name: /Scan & Match Keywords/i });
      fireEvent.click(scanButton);

      // Verify analysis completes cleanly and displays results
      await waitFor(() => {
        expect(screen.getByText(/Keyword gap analysis completed and saved!/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify XSS immunity: script was not executed or injected into document
      expect((window as any).__PWNED_KEYWORD__).toBeUndefined();
      expect(document.getElementById("adversarial-xss")).toBeNull();

      // Verify Puter KV updated atomically with keywordAnalysis
      const updatedRaw = await puterMock.kv.get(`resume:${testResumeId}`);
      const updatedRecord: Resume = JSON.parse(updatedRaw!);
      expect(updatedRecord.keywordAnalysis).toBeDefined();
      expect(updatedRecord.keywordAnalysis!.matchRate).toBeGreaterThanOrEqual(0);

      unmount();
    }, 20000);
  });

  // =========================================================================
  // 3. Unauthorized Session State Mid-Workspace and Redirection Integrity
  // =========================================================================
  describe("3. Unauthorized Session State & Redirection Integrity", () => {
    it("redirects unauthenticated visitor attempting deep link to /resume/:id with preserved query params", async () => {
      // Set unauthenticated session
      usePuterStore.setState({
        authStatus: "unauthenticated",
        auth: {
          ...usePuterStore.getState().auth,
          isAuthenticated: false,
          authStatus: "unauthenticated",
          user: null,
        },
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={["/resume/target-resume-uuid?tab=cover-letter"]}>
          <Routes>
            <Route path="/resume/:id" element={<ResumeWorkspace />} />
            <Route path="/auth" element={<div data-testid="auth-redirect-screen">Auth Gate</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Intercepted by AuthGuard and redirected to /auth
      expect(await screen.findByTestId("auth-redirect-screen")).toBeInTheDocument();

      // Verify no resume data or workspace panes leaked into DOM
      expect(screen.queryByLabelText("Document Preview")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Resume Evaluation and Tools")).not.toBeInTheDocument();

      unmount();
    }, 15000);

    it("ejects active user and redirects to login when session drops mid-workspace", async () => {
      const testResumeId = "session-drop-test";
      const testResume: Resume = {
        id: testResumeId,
        companyName: "Secure Financial Corp",
        jobTitle: "Security Architect",
        imagePath: "mock/p1.png",
        resumePath: "mock/res.pdf",
        parsedText: "Confidential financial resume data.",
        pageCount: 1,
        feedback: DEFAULT_AI_FEEDBACK_DATA as Feedback,
      };
      await puterMock.kv.set(`resume:${testResumeId}`, JSON.stringify(testResume));

      const { unmount } = render(
        <MemoryRouter initialEntries={[`/resume/${testResumeId}?tab=overview`]}>
          <Routes>
            <Route path="/resume/:id" element={<ResumeWorkspace />} />
            <Route path="/auth" element={<div data-testid="auth-ejected-screen">Session Expired Login</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Verify workspace initial authenticated render
      expect(await screen.findByText("Security Architect")).toBeInTheDocument();

      // Mid-workspace session expiration / logout triggered
      usePuterStore.setState({
        authStatus: "unauthenticated",
        auth: {
          ...usePuterStore.getState().auth,
          isAuthenticated: false,
          authStatus: "unauthenticated",
          user: null,
        },
      });

      // AuthGuard immediately intercepts the revoked session
      expect(await screen.findByTestId("auth-ejected-screen")).toBeInTheDocument();

      // Sensitive workspace content is evicted from view
      expect(screen.queryByText("Security Architect")).not.toBeInTheDocument();

      unmount();
    }, 15000);
  });

  // =========================================================================
  // 4. Malicious or Invalid Tab Query Parameters
  // =========================================================================
  describe("4. Malicious or Invalid Tab Query Parameters (?tab=)", () => {
    const testResumeId = "tab-tampering-test";

    beforeEach(async () => {
      const testResume: Resume = {
        id: testResumeId,
        companyName: "Stripe",
        jobTitle: "Staff Infrastructure Engineer",
        imagePath: "mock/p1.png",
        resumePath: "mock/res.pdf",
        parsedText: "Distributed systems, Raft consensus, Go.",
        pageCount: 1,
        feedback: DEFAULT_AI_FEEDBACK_DATA as Feedback,
      };
      await puterMock.kv.set(`resume:${testResumeId}`, JSON.stringify(testResume));
    });

    it("sanitizes path traversal query parameter (?tab=../../malicious) and falls back safely to Overview tab", async () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={[`/resume/${testResumeId}?tab=../../malicious`]}>
          <Routes>
            <Route path="/resume/:id" element={<ResumeWorkspace />} />
          </Routes>
        </MemoryRouter>
      );

      // Workspace survives without throwing uncaught errors
      expect(await screen.findByText("Staff Infrastructure Engineer")).toBeInTheDocument();

      // Overview Tab is safely rendered by fallback logic
      expect(screen.getByText(/ATS Evaluation/i)).toBeInTheDocument();
      expect(screen.getByText("Tone & Style")).toBeInTheDocument();

      // Tab button for Overview has aria-selected="true"
      const overviewTab = screen.getByRole("tab", { name: /Overview/i });
      expect(overviewTab).toHaveAttribute("aria-selected", "true");

      unmount();
    }, 15000);

    it("safely neutralizes prototype pollution and script injection in ?tab= parameters", async () => {
      const hostileTabs = [
        "__proto__",
        "constructor",
        "<script>alert('xss')</script>",
        "unknown_nonexistent_tab",
        "'' OR 1=1 --",
      ];

      for (const hostileTab of hostileTabs) {
        const { unmount } = render(
          <MemoryRouter initialEntries={[`/resume/${testResumeId}?tab=${encodeURIComponent(hostileTab)}`]}>
            <Routes>
              <Route path="/resume/:id" element={<ResumeWorkspace />} />
            </Routes>
          </MemoryRouter>
        );

        // All malicious/unknown tabs safely fall back to overview without crashing
        expect(await screen.findByText("Staff Infrastructure Engineer")).toBeInTheDocument();
        expect(screen.getByText(/ATS Evaluation/i)).toBeInTheDocument();

        unmount();
      }
    }, 20000);
  });

  // =========================================================================
  // 5. Rapid State Mutations and Atomic KV Deletion Edge Cases
  // =========================================================================
  describe("5. Rapid State Mutations & Atomic KV Deletion Edge Cases", () => {
    it("renders 'Resume Not Found' when accessing a non-existent or deleted resume ID", async () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={["/resume/non-existent-guid-404?tab=overview"]}>
          <Routes>
            <Route path="/resume/:id" element={<ResumeWorkspace />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText("Resume Not Found")).toBeInTheDocument();
      expect(
        screen.getByText(/The requested resume record was not found in your Puter storage/i)
      ).toBeInTheDocument();

      const returnLink = screen.getByRole("link", { name: /Return to Dashboard/i });
      expect(returnLink).toHaveAttribute("href", "/");

      unmount();
    }, 15000);

    it("handles corrupted non-JSON strings in Puter KV without unhandled syntax exceptions", async () => {
      const corruptResumeId = "corrupt-kv-json-record";
      // Store malformed raw JSON string directly into Puter KV
      await puterMock.kv.set(`resume:${corruptResumeId}`, "INVALID_JSON{{[ unclosed syntax error");

      const { unmount } = render(
        <MemoryRouter initialEntries={[`/resume/${corruptResumeId}?tab=overview`]}>
          <Routes>
            <Route path="/resume/:id" element={<ResumeWorkspace />} />
          </Routes>
        </MemoryRouter>
      );

      // safeJsonParse safely returns null fallback -> Workspace renders Resume Not Found
      expect(await screen.findByText("Resume Not Found")).toBeInTheDocument();

      unmount();
    }, 15000);

    it("preserves atomic KV record integrity across multiple rapid consecutive state mutations", async () => {
      const testResumeId = "rapid-mutations-test";
      const initialResume: Resume = {
        id: testResumeId,
        companyName: "Rapid Tech",
        jobTitle: "Senior DevOps Engineer",
        imagePath: "mock/p1.png",
        resumePath: "mock/res.pdf",
        parsedText: "Kubernetes, Terraform, AWS, CI/CD pipeline automation.",
        pageCount: 1,
        feedback: DEFAULT_AI_FEEDBACK_DATA as Feedback,
      };
      await puterMock.kv.set(`resume:${testResumeId}`, JSON.stringify(initialResume));

      const { unmount } = render(
        <MemoryRouter initialEntries={[`/resume/${testResumeId}?tab=overview`]}>
          <Routes>
            <Route path="/resume/:id" element={<ResumeWorkspace />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText("Senior DevOps Engineer")).toBeInTheDocument();

      // Jump to STAR Rewriter and save a rewrite
      fireEvent.click(screen.getByRole("tab", { name: /STAR Rewriter/i }));
      const bulletInput = await screen.findByLabelText(/Original Bullet Point/i);
      fireEvent.change(bulletInput, { target: { value: "Automated server deployment pipeline." } });
      fireEvent.click(screen.getByRole("button", { name: /Transform with AI \(STAR Method\)/i }));

      const saveRewriteBtns = await screen.findAllByRole("button", { name: /^Save$/i });
      fireEvent.click(saveRewriteBtns[0]);

      // Jump to Cover Letter and save draft
      fireEvent.click(screen.getByRole("tab", { name: /Cover Letter/i }));
      const generateLetterBtn = await screen.findByRole("button", { name: /Generate Tailored Letter/i });
      fireEvent.click(generateLetterBtn);

      const saveLetterBtn = await screen.findByRole("button", { name: /Save Draft/i });
      fireEvent.click(saveLetterBtn);

      // Jump to Interview Prep and bookmark
      fireEvent.click(screen.getByRole("tab", { name: /Interview Prep/i }));
      const generatePrepBtn = await screen.findByRole("button", { name: /Generate 6-8 Questions/i });
      fireEvent.click(generatePrepBtn);

      const bookmarkBtns = await screen.findAllByRole("button", { name: /Bookmark for Review/i });
      fireEvent.click(bookmarkBtns[0]);

      // Verify that all rapid mutations were atomically persisted into Puter KV under resume:${id}
      await waitFor(async () => {
        const finalRaw = await puterMock.kv.get(`resume:${testResumeId}`);
        const finalRecord: Resume = JSON.parse(finalRaw!);
        expect(finalRecord.savedStarRewrites?.length).toBeGreaterThanOrEqual(1);
        expect(finalRecord.coverLetters?.length).toBeGreaterThanOrEqual(1);
        expect(finalRecord.interviewPrep).toBeDefined();
        expect(finalRecord.updatedAt).toBeDefined();
      }, { timeout: 10000 });

      unmount();
    }, 25000);

    it("survives concurrent deletion and non-existent IDs during dashboard deletion", async () => {
      const testResumeId = "concurrent-delete-test";
      const initialResume: Resume = {
        id: testResumeId,
        companyName: "Ghost Corp",
        jobTitle: "Distributed Systems Lead",
        imagePath: "mock/p1.png",
        resumePath: "mock/res.pdf",
        parsedText: "Ghost engineer.",
        pageCount: 1,
        feedback: DEFAULT_AI_FEEDBACK_DATA as Feedback,
      };
      await puterMock.kv.set(`resume:${testResumeId}`, JSON.stringify(initialResume));

      const { unmount } = render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText("Ghost Corp")).toBeInTheDocument();

      // Simulate external concurrent deletion of the KV key before user clicks confirm
      await puterMock.kv.del(`resume:${testResumeId}`);

      // Now user attempts to delete the item in Dashboard UI
      const deleteBtn = screen.getByTitle("Delete Evaluation");
      fireEvent.click(deleteBtn);

      // Confirm modal opens
      expect(await screen.findByText(/Are you sure you want to delete this evaluation\?/i)).toBeInTheDocument();
      const confirmBtn = screen.getByRole("button", { name: /Confirm Delete/i });
      fireEvent.click(confirmBtn);

      // Dashboard handles the already-deleted key cleanly and updates local state
      await waitFor(() => {
        expect(screen.getByText(/deleted successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/No Resumes Evaluated Yet/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      unmount();
    }, 15000);
  });
});
