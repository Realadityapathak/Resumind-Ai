import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import Upload from "~/routes/upload";
import { usePuterStore } from "~/services/puter/store";
import {
  puterMock,
  resetPuterMock,
  installPuterMock,
  DEFAULT_MOCK_USER,
} from "../mocks/puterMock";

vi.mock("~/services/pdf/processPdfDocument", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/services/pdf/processPdfDocument")>();
  return {
    ...actual,
    processPdfDocument: vi.fn(async () => ({
      pages: [
        {
          pageNumber: 1,
          imageUrl: "blob:rollback-page-1",
          file: new File(["page-1"], "rollback_page_1.png", { type: "image/png" }),
          width: 1200,
          height: 1600,
          text: "Jane Doe, Platform Engineer.",
        },
        {
          pageNumber: 2,
          imageUrl: "blob:rollback-page-2",
          file: new File(["page-2"], "rollback_page_2.png", { type: "image/png" }),
          width: 1200,
          height: 1600,
          text: "Built reliable distributed systems.",
        },
      ],
      pageCount: 2,
      fullText: "Jane Doe, Platform Engineer. Built reliable distributed systems.",
      pagesText: ["Jane Doe, Platform Engineer.", "Built reliable distributed systems."],
      isScanned: false,
    })),
  };
});

describe("Upload pipeline cleanup (app/routes/upload.tsx)", () => {
  const kvSetMock = vi.fn();

  beforeEach(() => {
    resetPuterMock();
    installPuterMock();
    kvSetMock.mockReset();
    kvSetMock.mockResolvedValue(false);

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
        set: kvSetMock,
        delete: (key: string) => puterMock.kv.del(key),
      },
      fs: puterMock.fs,
      ai: puterMock.ai,
    });
  });

  it("rolls back the source PDF and every preview image when the KV write fails", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/upload"]}>
        <Routes>
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </MemoryRouter>
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const resumeFile = new File(["%PDF-1.4 rollback test"], "rollback_resume.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [resumeFile] } });
    expect(await screen.findByText("rollback_resume.pdf")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Analyze Resume/i }));

    await waitFor(() => expect(kvSetMock).toHaveBeenCalledOnce(), { timeout: 5000 });
    expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent(
      /Failed to save resume record/i
    );

    await waitFor(() => {
      expect(puterMock.fsStore.size).toBe(0);
    });
    expect(puterMock.kvStore.size).toBe(0);
    expect(puterMock.fs.delete).toHaveBeenCalledTimes(3);
  });
});
