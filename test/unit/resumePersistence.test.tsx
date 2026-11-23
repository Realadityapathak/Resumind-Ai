import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import ResumeWorkspace from "~/routes/resume";
import { usePuterStore } from "~/services/puter/store";
import {
  puterMock,
  resetPuterMock,
  installPuterMock,
  DEFAULT_MOCK_USER,
  DEFAULT_AI_FEEDBACK_DATA,
} from "../mocks/puterMock";

const SAVE_FAIL_RESUME: Resume = {
  id: "save-fail-1",
  companyName: "Persistence Co",
  jobTitle: "Staff Engineer",
  jobDescription:
    "We need a staff engineer with distributed systems, TypeScript, React, and cloud infrastructure experience.",
  imagePath: "",
  resumePath: "",
  parsedText:
    "Staff engineer with distributed systems, TypeScript, React, and cloud infrastructure experience.",
  pageCount: 1,
  feedback: DEFAULT_AI_FEEDBACK_DATA as Feedback,
};

describe("Resume workspace persistence (app/routes/resume.tsx)", () => {
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

  it("shows an explicit unsaved state when a child tab's KV write fails", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/resume/save-fail-1",
            search: "?tab=keywords",
            state: { initialResume: SAVE_FAIL_RESUME },
          },
        ]}
      >
        <Routes>
          <Route path="/resume/:id" element={<ResumeWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    const analyzeBtn = await screen.findByRole("button", { name: /Scan & Match Keywords/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(kvSetMock).toHaveBeenCalledOnce();
    });

    expect(await screen.findByText("Changes not saved")).toBeInTheDocument();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByText(/could not be saved/i)).toBeInTheDocument();
    expect(screen.queryByText("Cloud saved")).not.toBeInTheDocument();
  });
});
