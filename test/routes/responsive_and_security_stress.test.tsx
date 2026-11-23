import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import * as fs from "fs";
import * as path from "path";
import Dashboard from "~/routes/dashboard";
import Navbar from "~/components/layout/Navbar";
import { usePuterStore } from "~/services/puter/store";
import { puterMock, resetPuterMock, seedPuterKV, DEFAULT_MOCK_USER } from "../mocks/puterMock";

describe("Adversarial Stress Test: Responsive Viewports, Touch Targets & Download Sanitization", () => {
  beforeEach(() => {
    resetPuterMock();
    (window as any).puter = puterMock;
    (globalThis as any).puter = puterMock;

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
        write: (filePath: string, data: any) => puterMock.fs.write(filePath, data),
        read: (filePath: string) => puterMock.fs.read(filePath),
        upload: (files: any) => puterMock.fs.upload(files),
        delete: (filePath: string) => puterMock.fs.delete(filePath),
        readDir: (dirPath: string) => puterMock.fs.readdir(dirPath),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. ADVERSARIAL DOWNLOAD FILENAME SANITIZATION & PATH TRAVERSAL DEFENSE
  // =========================================================================
  describe("1. Download Filename Sanitization & Path Traversal Prevention", () => {
    const maliciousFilenameCases = [
      {
        id: "attack-1",
        label: "POSIX path traversal escape (../../etc/passwd)",
        fileName: "../../etc/passwd",
        companyName: "Adversary Corp",
        expectedSanitized: ".._.._etc_passwd",
      },
      {
        id: "attack-2",
        label: "Relative path traversal with extension (evil/../file.pdf)",
        fileName: "evil/../file.pdf",
        companyName: "Adversary Corp",
        expectedSanitized: "evil_.._file.pdf",
      },
      {
        id: "attack-3",
        label: "Windows UNC/backslash path traversal (..\\..\\Windows\\System32\\cmd.exe)",
        fileName: "..\\..\\Windows\\System32\\cmd.exe",
        companyName: "Adversary Corp",
        expectedSanitized: ".._.._Windows_System32_cmd.exe",
      },
      {
        id: "attack-4",
        label: "Null-byte injection string termination (my_resume.pdf\0.exe)",
        fileName: "my_resume.pdf\0.exe",
        companyName: "Adversary Corp",
        expectedSanitized: "my_resume.pdf_.exe",
      },
      {
        id: "attack-5",
        label: "Illegal Windows/FAT filesystem characters (<>:\"|?*file.pdf)",
        fileName: '<>:"|?*file.pdf',
        companyName: "Adversary Corp",
        expectedSanitized: "_______file.pdf",
      },
      {
        id: "attack-6",
        label: "Shell command injection and pipe characters ($(whoami); rm -rf /;.pdf)",
        fileName: "$(whoami); rm -rf /;.pdf",
        companyName: "Adversary Corp",
        expectedSanitized: "__whoami___rm_-rf___.pdf",
      },
      {
        id: "attack-7",
        label: "Deep directory traversal escape (../../../../../../../../../../var/log/syslog)",
        fileName: "../../../../../../../../../../var/log/syslog",
        companyName: "Adversary Corp",
        expectedSanitized: ".._.._.._.._.._.._.._.._.._.._var_log_syslog",
      },
      {
        id: "attack-8",
        label: "URL encoded path traversal (%2e%2e%2f%2e%2e%2fetc%2fshadow)",
        fileName: "%2e%2e%2f%2e%2e%2fetc%2fshadow",
        companyName: "Adversary Corp",
        expectedSanitized: "_2e_2e_2f_2e_2e_2fetc_2fshadow",
      },
      {
        id: "attack-9",
        label: "Fallback to malicious companyName when fileName is missing (../../etc/hosts)",
        fileName: null,
        companyName: "../../etc/hosts",
        expectedSanitized: ".._.._etc_hosts.pdf",
      },
      {
        id: "attack-10",
        label: "Fallback to default resume.pdf when both fileName and companyName are missing",
        fileName: null,
        companyName: null,
        expectedSanitized: "resume.pdf",
      },
      {
        id: "attack-11",
        label: "Whitespace padding with path traversal ('   ../../secret.pdf   ')",
        fileName: "   ../../secret.pdf   ",
        companyName: "Adversary Corp",
        expectedSanitized: "___.._.._secret.pdf___",
      },
      {
        id: "attack-12",
        label: "Empty string fileName and companyName fallback to default resume.pdf",
        fileName: "",
        companyName: "",
        expectedSanitized: "resume.pdf",
      },
      {
        id: "attack-13",
        label: "Mixed unicode and directory climb ('../../résumé.pdf')",
        fileName: "../../résumé.pdf",
        companyName: "Adversary Corp",
        expectedSanitized: ".._.._r_sum_.pdf",
      },
    ];

    maliciousFilenameCases.forEach((tc) => {
      it(`sanitizes adversarial filename: ${tc.label}`, async () => {
        const resumeId = tc.id;
        const resumePath = `resumes/${resumeId}.pdf`;
        await puterMock.fs.write(resumePath, "%PDF-1.4 Mock Binary Content");

        const resumeRecord: Record<string, any> = {
          [`resume:${resumeId}`]: {
            id: resumeId,
            companyName: tc.companyName,
            jobTitle: "Software Engineer",
            fileName: tc.fileName,
            resumePath: resumePath,
            imagePath: `resumes/${resumeId}.png`,
            createdAt: "2026-11-08T10:00:00.000Z",
            feedback: { overallScore: 85 },
          },
        };
        seedPuterKV(resumeRecord);

        let capturedDownload: string | null = null;
        let capturedHref: string | null = null;
        const clickSpy = vi
          .spyOn(HTMLAnchorElement.prototype, "click")
          .mockImplementation(function (this: HTMLAnchorElement) {
            capturedDownload = this.download;
            capturedHref = this.href;
          });

        const appendSpy = vi.spyOn(document.body, "appendChild");
        const removeSpy = vi.spyOn(document.body, "removeChild");

        render(
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        );

        const downloadBtn = await screen.findByTestId(`download-btn-${resumeId}`);
        expect(downloadBtn).toBeInTheDocument();

        await act(async () => {
          fireEvent.click(downloadBtn);
        });

        expect(clickSpy).toHaveBeenCalled();
        expect(appendSpy).toHaveBeenCalled();
        expect(removeSpy).toHaveBeenCalled();

        expect(capturedDownload).toBe(tc.expectedSanitized);
        expect(capturedHref).toBeTruthy();

        // Strict security invariants:
        // 1. Path traversal slashes must never exist in the download filename
        expect(capturedDownload).not.toContain("/");
        expect(capturedDownload).not.toContain("\\");
        // 2. Null bytes must never exist
        expect(capturedDownload).not.toContain("\0");
        // 3. Characters must be restricted to safe set [a-zA-Z0-9._-]
        expect(capturedDownload).toMatch(/^[a-zA-Z0-9._-]+$/);
      });
    });

    it("verifies safe download behavior in Table View mode as well as Grid View", async () => {
      const resumeId = "table-attack-1";
      const resumePath = `resumes/${resumeId}.pdf`;
      await puterMock.fs.write(resumePath, "%PDF-1.4 Mock Binary Content");

      seedPuterKV({
        [`resume:${resumeId}`]: {
          id: resumeId,
          companyName: "Table Corp",
          jobTitle: "Security Analyst",
          fileName: "malicious/../../shell.sh",
          resumePath: resumePath,
          feedback: { overallScore: 78 },
        },
      });

      let capturedDownload: string | null = null;
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        capturedDownload = this.download;
      });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      const tableToggleBtn = await screen.findByRole("button", { name: /table view/i });
      fireEvent.click(tableToggleBtn);

      const tableDownloadBtn = await screen.findByTestId(`download-btn-${resumeId}`);
      await act(async () => {
        fireEvent.click(tableDownloadBtn);
      });

      expect(capturedDownload).toBe("malicious_.._.._shell.sh");
      expect(capturedDownload).not.toContain("/");
      expect(capturedDownload).not.toContain("\\");
    });
  });

  // =========================================================================
  // 2. DEFERRED OBJECT URL REVOCATION LIFECYCLE
  // =========================================================================
  describe("2. Deferred Object URL Revocation Timing & Resilience", () => {
    it("ensures Object URL is not revoked prematurely, allowing browser download initiation", async () => {
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {});

      const resumeId = "timing-res-1";
      const resumePath = `resumes/${resumeId}.pdf`;
      await puterMock.fs.write(resumePath, "%PDF-1.4 Mock Binary Content");

      seedPuterKV({
        [`resume:${resumeId}`]: {
          id: resumeId,
          companyName: "Acme Cloud",
          jobTitle: "DevOps",
          fileName: "acme_devops.pdf",
          resumePath: resumePath,
          feedback: { overallScore: 90 },
        },
      });

      const mockBlobUrl = "blob:resumind-mock-secure-url-12345";
      const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue(mockBlobUrl);
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      const downloadBtn = await screen.findByTestId(`download-btn-${resumeId}`);

      vi.useFakeTimers();

      await act(async () => {
        fireEvent.click(downloadBtn);
      });

      // Assert URL.createObjectURL was called immediately
      expect(createObjectURLSpy).toHaveBeenCalled();

      // Invariant: Immediately after click, revokeObjectURL MUST NOT have been called yet for download URL
      expect(revokeObjectURLSpy).not.toHaveBeenCalledWith(mockBlobUrl);

      // Invariant: At t = 500ms, revokeObjectURL STILL must not have been called
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(revokeObjectURLSpy).not.toHaveBeenCalledWith(mockBlobUrl);

      // Invariant: At t = 1000ms, deferred revocation executes safely
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockBlobUrl);
    });

    it("handles rapid consecutive downloads without premature URL revocation collisions", async () => {
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {});

      await puterMock.fs.write("resumes/res-a.pdf", "Content A");
      await puterMock.fs.write("resumes/res-b.pdf", "Content B");

      seedPuterKV({
        "resume:res-a": {
          id: "res-a",
          companyName: "Company A",
          resumePath: "resumes/res-a.pdf",
          feedback: { overallScore: 80 },
        },
        "resume:res-b": {
          id: "res-b",
          companyName: "Company B",
          resumePath: "resumes/res-b.pdf",
          feedback: { overallScore: 82 },
        },
      });

      let urlCount = 0;
      const createdUrls: string[] = [];
      vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
        urlCount++;
        const url = `blob:resumind-url-${urlCount}`;
        createdUrls.push(url);
        return url;
      });
      const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      const btnA = await screen.findByTestId("download-btn-res-a");
      const btnB = await screen.findByTestId("download-btn-res-b");

      vi.useFakeTimers();

      // Click download A at t=0
      await act(async () => {
        fireEvent.click(btnA);
      });
      expect(createdUrls).toContain("blob:resumind-url-1");
      expect(revokeSpy).not.toHaveBeenCalledWith("blob:resumind-url-1");

      // Advance by 300ms, then click download B at t=300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {
        fireEvent.click(btnB);
      });
      expect(createdUrls).toContain("blob:resumind-url-2");

      // At t=800ms (500ms after B): neither download URL should be revoked yet
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(revokeSpy).not.toHaveBeenCalledWith("blob:resumind-url-1");
      expect(revokeSpy).not.toHaveBeenCalledWith("blob:resumind-url-2");

      // At t=1050ms (1050ms after A, 750ms after B): A is revoked, B is not revoked yet
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(revokeSpy).toHaveBeenCalledWith("blob:resumind-url-1");
      expect(revokeSpy).not.toHaveBeenCalledWith("blob:resumind-url-2");

      // At t=1350ms (1050ms after B): B is now revoked
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(revokeSpy).toHaveBeenCalledWith("blob:resumind-url-2");
    });

    it("displays error toast and does not leak Object URLs when cloud storage read fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      seedPuterKV({
        "resume:res-err": {
          id: "res-err",
          companyName: "Missing Cloud PDF",
          resumePath: "resumes/nonexistent.pdf",
          feedback: { overallScore: 70 },
        },
      });

      // Force fs.read to throw an error
      const fsReadMock = vi.fn().mockRejectedValue(new Error("Puter FS: File not found"));
      usePuterStore.setState({
        fs: {
          ...usePuterStore.getState().fs,
          read: fsReadMock,
        },
      });

      const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      const downloadBtn = await screen.findByTestId("download-btn-res-err");
      await act(async () => {
        fireEvent.click(downloadBtn);
      });

      // Verify error handling
      expect(createObjectURLSpy).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(
          screen.getByText("Could not download resume PDF from cloud storage.")
        ).toBeInTheDocument();
      });
      consoleErrorSpy.mockRestore();
    });
  });

  // =========================================================================
  // 3. RESPONSIVE CSS CLASS VERIFICATION IN GLOBAL.CSS
  // =========================================================================
  describe("3. Responsive CSS Classes & Fluid Typography in global.css", () => {
    const cssPath = path.resolve(process.cwd(), "app/styles/global.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    it("defines fluid typography scaling across mobile, tablet, and desktop viewports on h1", () => {
      expect(cssContent).toContain("text-3xl");
      expect(cssContent).toContain("sm:text-4xl");
      expect(cssContent).toContain("md:text-5xl");
      expect(cssContent).toContain("lg:text-6xl");
      expect(cssContent).toContain("tracking-[-1px]");
      expect(cssContent).toContain("sm:tracking-[-2px]");
    });

    it("defines fluid typography scaling on h2", () => {
      expect(cssContent).toContain("text-xl");
      expect(cssContent).toContain("sm:text-2xl");
      expect(cssContent).toContain("md:text-3xl");
    });

    it("defines responsive margins and padding in .main-section", () => {
      expect(cssContent).toContain(".main-section");
      expect(cssContent).toContain("pt-6");
      expect(cssContent).toContain("sm:pt-12");
      expect(cssContent).toContain("mx-4");
      expect(cssContent).toContain("sm:mx-8");
      expect(cssContent).toContain("md:mx-15");
      expect(cssContent).toContain("pb-5");
    });

    it("defines responsive navbar padding in .navbar", () => {
      expect(cssContent).toContain(".navbar");
      expect(cssContent).toContain("p-3");
      expect(cssContent).toContain("sm:p-4");
      expect(cssContent).toContain("px-4");
      expect(cssContent).toContain("sm:px-6");
      expect(cssContent).toContain("md:px-10");
      expect(cssContent).toContain("max-w-[1200px]");
      expect(cssContent).toContain("mx-auto");
    });

    it("defines responsive primary-button vertical padding", () => {
      expect(cssContent).toContain(".primary-button");
      expect(cssContent).toContain("py-2.5");
      expect(cssContent).toContain("sm:py-3");
    });

    it("defines print stylesheet hiding navigation chrome", () => {
      expect(cssContent).toContain("@media print");
      expect(cssContent).toContain("nav,");
      expect(cssContent).toContain("aside,");
      expect(cssContent).toContain("header,");
      expect(cssContent).toContain(".no-print");
      expect(cssContent).toContain("display: none !important");
    });
  });

  // =========================================================================
  // 4. MOBILE NAVIGATION HAMBURGER MENU & TOUCH TARGET ACCESSIBILITY
  // =========================================================================
  describe("4. Mobile Navigation Hamburger Menu & Touch Target Accessibility", () => {
    it("verifies mobile hamburger button touch target meets the 44x44px minimum accessibility standard", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar />
        </MemoryRouter>
      );

      const hamburgerBtn = screen.getByLabelText(/toggle navigation menu/i);
      expect(hamburgerBtn).toBeInTheDocument();

      // WCAG 2.5.5 / 2.5.8 Touch Target class invariants
      expect(hamburgerBtn.className).toContain("min-w-[44px]");
      expect(hamburgerBtn.className).toContain("min-h-[44px]");

      // Accessibility attribute invariants
      expect(hamburgerBtn).toHaveAttribute("aria-label", "Toggle navigation menu");
      expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");

      // Verify that the button container is hidden on desktop (md:hidden)
      const mobileContainer = hamburgerBtn.closest(".md\\:hidden") || hamburgerBtn.parentElement;
      expect(mobileContainer?.className).toContain("md:hidden");
    });

    it("toggles hamburger drawer open and closed with aria-expanded synchronization", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar />
        </MemoryRouter>
      );

      const hamburgerBtn = screen.getByLabelText(/toggle navigation menu/i);
      expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(hamburgerBtn);
      expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByTestId("mobile-menu-drawer")).toBeInTheDocument();

      // Click again to close
      fireEvent.click(hamburgerBtn);
      expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();
    });

    it("closes mobile drawer via dedicated close button", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar />
        </MemoryRouter>
      );

      const hamburgerBtn = screen.getByLabelText(/toggle navigation menu/i);
      fireEvent.click(hamburgerBtn);
      expect(screen.getByTestId("mobile-menu-drawer")).toBeInTheDocument();

      const closeBtn = screen.getByLabelText(/close menu/i);
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();
      expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
    });

    it("closes mobile drawer when clicking the dimmed backdrop overlay", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar />
        </MemoryRouter>
      );

      const hamburgerBtn = screen.getByLabelText(/toggle navigation menu/i);
      fireEvent.click(hamburgerBtn);
      expect(screen.getByTestId("mobile-menu-drawer")).toBeInTheDocument();

      const backdrop = screen.getByTestId("mobile-menu-backdrop");
      expect(backdrop).toBeInTheDocument();
      expect(backdrop).toHaveAttribute("aria-hidden", "true");

      fireEvent.click(backdrop);
      expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();
    });

    it("closes mobile drawer when pressing the Escape key", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar />
        </MemoryRouter>
      );

      const hamburgerBtn = screen.getByLabelText(/toggle navigation menu/i);
      fireEvent.click(hamburgerBtn);
      expect(screen.getByTestId("mobile-menu-drawer")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();
    });

    it("renders unauthenticated mobile navigation drawer with public links and CTAs", () => {
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
        <MemoryRouter initialEntries={["/"]}>
          <Navbar />
        </MemoryRouter>
      );

      const hamburgerBtn = screen.getByLabelText(/toggle navigation menu/i);
      fireEvent.click(hamburgerBtn);

      const drawer = screen.getByTestId("mobile-menu-drawer");
      expect(within(drawer).getByText("Features")).toBeInTheDocument();
      expect(within(drawer).getByText("How It Works")).toBeInTheDocument();
      expect(within(drawer).getByText("Testimonials")).toBeInTheDocument();
      expect(within(drawer).getByText("FAQ")).toBeInTheDocument();
      expect(within(drawer).getByText("Analyze Resume Free")).toBeInTheDocument();
      expect(within(drawer).getByText("Sign In")).toBeInTheDocument();

      // Clicking a navigation link in drawer dismisses the drawer
      const featuresLink = within(drawer).getByText("Features");
      fireEvent.click(featuresLink);
      expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();
    });

    it("renders authenticated mobile navigation drawer with user identity, auth links, and Sign Out", async () => {
      const mockSignOut = vi.fn();
      usePuterStore.setState({
        authStatus: "authenticated",
        puterReady: true,
        isLoading: false,
        auth: {
          user: { uuid: "user_adv_99", username: "alexdeveloper" },
          isAuthenticated: true,
          authStatus: "authenticated",
          signIn: vi.fn(),
          signOut: mockSignOut,
          refreshUser: vi.fn(),
          checkAuthStatus: vi.fn(async () => true),
          getUser: () => ({ uuid: "user_adv_99", username: "alexdeveloper" }),
        },
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Navbar />
        </MemoryRouter>
      );

      const hamburgerBtn = screen.getByLabelText(/toggle navigation menu/i);
      fireEvent.click(hamburgerBtn);

      const drawer = screen.getByTestId("mobile-menu-drawer");

      // Verify user identity badge
      expect(within(drawer).getByText("@alexdeveloper")).toBeInTheDocument();
      expect(within(drawer).getByText("AL")).toBeInTheDocument();

      // Verify authenticated navigation links
      expect(within(drawer).getByText("Dashboard")).toBeInTheDocument();
      expect(within(drawer).getByText("AI Workspace")).toBeInTheDocument();
      expect(within(drawer).getByText("Upload Resume")).toBeInTheDocument();
      expect(within(drawer).getByText("Profile & Settings")).toBeInTheDocument();

      // Verify Sign Out button
      const signOutBtn = within(drawer).getByRole("button", { name: /sign out/i });
      expect(signOutBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(signOutBtn);
      });
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
