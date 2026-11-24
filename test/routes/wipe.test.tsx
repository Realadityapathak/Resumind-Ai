import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import WipeApp from "~/routes/wipe";
import { usePuterStore } from "~/services/puter/store";
import { telemetry } from "~/services/telemetry";

describe("Wipe Route (app/routes/wipe.tsx)", () => {
  const mockFsDelete = vi.fn().mockResolvedValue(true);
  const mockFsReadDir = vi.fn().mockResolvedValue([
    { id: "1", name: "resume_1.pdf", path: "./resume_1.pdf" },
    { id: "2", name: "page_1.png", path: "./page_1.png" },
  ]);
  const mockKvFlush = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();

    usePuterStore.setState({
      authStatus: "authenticated",
      puterReady: true,
      isLoading: false,
      auth: {
        user: { username: "alexdeveloper", uuid: "user-123" } as PuterUser,
        isAuthenticated: true,
        authStatus: "authenticated",
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        checkAuthStatus: vi.fn(async () => true),
        getUser: () => ({ username: "alexdeveloper", uuid: "user-123" } as PuterUser),
      },
      fs: {
        readDir: mockFsReadDir,
        delete: mockFsDelete,
        write: vi.fn(),
        read: vi.fn(),
      } as any,
      kv: {
        flush: mockKvFlush,
        list: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      } as any,
      error: null,
      clearError: vi.fn(),
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
      <MemoryRouter initialEntries={["/wipe"]}>
        <Routes>
          <Route path="/wipe" element={<WipeApp />} />
          <Route path="/auth" element={<div data-testid="auth-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-page")).toBeInTheDocument();
    });
  });

  it("renders authenticated user information and lists existing files", async () => {
    render(
      <MemoryRouter initialEntries={["/wipe"]}>
        <WipeApp />
      </MemoryRouter>
    );

    expect(screen.getByText(/Authenticated as @alexdeveloper/i)).toBeInTheDocument();
    expect(screen.getByText("Wipe app data")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("resume_1.pdf")).toBeInTheDocument();
      expect(screen.getByText("page_1.png")).toBeInTheDocument();
      expect(screen.getByText("2 total")).toBeInTheDocument();
    });
  });

  it("renders empty state when no files exist", async () => {
    mockFsReadDir.mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={["/wipe"]}>
        <WipeApp />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No cached files in this account.")).toBeInTheDocument();
      expect(screen.getByText("0 total")).toBeInTheDocument();
    });
  });

  it("requires confirmation checkbox to enable Wipe App Data button", async () => {
    render(
      <MemoryRouter initialEntries={["/wipe"]}>
        <WipeApp />
      </MemoryRouter>
    );

    const wipeButton = screen.getByRole("button", { name: /Wipe App Data/i });
    expect(wipeButton).toBeDisabled();

    const checkbox = screen.getByLabelText(/I understand that this action is irreversible/i);
    expect(checkbox).not.toBeChecked();

    act(() => {
      fireEvent.click(checkbox);
    });
    expect(checkbox).toBeChecked();
    expect(wipeButton).toBeEnabled();

    act(() => {
      fireEvent.click(checkbox);
    });
    expect(checkbox).not.toBeChecked();
    expect(wipeButton).toBeDisabled();
  });

  it("executes atomic deletion of Puter KV keys and FS files upon confirmation", async () => {
    render(
      <MemoryRouter initialEntries={["/wipe"]}>
        <WipeApp />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("resume_1.pdf")).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/I understand that this action is irreversible/i);
    act(() => {
      fireEvent.click(checkbox);
    });

    const wipeButton = screen.getByRole("button", { name: /Wipe App Data/i });
    act(() => {
      fireEvent.click(wipeButton);
    });

    await waitFor(() => {
      expect(mockFsDelete).toHaveBeenCalledWith("./resume_1.pdf");
      expect(mockFsDelete).toHaveBeenCalledWith("./page_1.png");
      expect(mockKvFlush).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText("All app data has been successfully wiped.")).toBeInTheDocument();
    });
  });

  it("handles failure during deletion gracefully with error status and logs to telemetry", async () => {
    const trackErrorSpy = vi.spyOn(telemetry, "trackError");
    mockKvFlush.mockRejectedValueOnce(new Error("KV Flush failed"));

    render(
      <MemoryRouter initialEntries={["/wipe"]}>
        <WipeApp />
      </MemoryRouter>
    );

    const checkbox = screen.getByLabelText(/I understand that this action is irreversible/i);
    act(() => {
      fireEvent.click(checkbox);
    });

    const wipeButton = screen.getByRole("button", { name: /Wipe App Data/i });
    act(() => {
      fireEvent.click(wipeButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Error occurred while wiping data. Please try again.")
      ).toBeInTheDocument();
      expect(trackErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ context: "wipe_app_data" })
      );
    });
  });

  it("attempts to delete all files even if one fails before reporting error", async () => {
    mockFsDelete.mockRejectedValueOnce(new Error("File 1 delete failed"));

    render(
      <MemoryRouter initialEntries={["/wipe"]}>
        <WipeApp />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("resume_1.pdf")).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/I understand that this action is irreversible/i);
    act(() => {
      fireEvent.click(checkbox);
    });

    const wipeButton = screen.getByRole("button", { name: /Wipe App Data/i });
    act(() => {
      fireEvent.click(wipeButton);
    });

    await waitFor(() => {
      // Both files were attempted
      expect(mockFsDelete).toHaveBeenCalledWith("./resume_1.pdf");
      expect(mockFsDelete).toHaveBeenCalledWith("./page_1.png");
      expect(
        screen.getByText("Error occurred while wiping data. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("renders cancel links navigating to profile", () => {
    render(
      <MemoryRouter initialEntries={["/wipe"]}>
        <WipeApp />
      </MemoryRouter>
    );

    const cancelButtons = screen.getAllByRole("link", { name: /Cancel|Back to profile/i });
    expect(cancelButtons.length).toBeGreaterThanOrEqual(2);
    cancelButtons.forEach((link) => {
      expect(link).toHaveAttribute("href", "/profile");
    });
  });

  it("renders cloud error state if store has an unhandled error", () => {
    usePuterStore.setState({
      error: "Unable to connect to Puter Storage Cluster",
    });

    render(
      <MemoryRouter initialEntries={["/wipe"]}>
        <WipeApp />
      </MemoryRouter>
    );

    expect(screen.getByText("Could not open cloud session")).toBeInTheDocument();
    expect(
      screen.getByText("Unable to connect to Puter Storage Cluster")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dismiss error/i })).toBeInTheDocument();
  });
});
