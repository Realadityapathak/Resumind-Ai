import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import AuthGuard from "~/components/auth/AuthGuard";
import Auth from "~/routes/auth";
import { usePuterStore } from "~/services/puter/store";

const TIMEOUT_ERROR = /Puter\.js failed to load within 10 seconds/i;

describe("Puter CDN initialization timeout (app/lib/puter.ts)", () => {
  beforeEach(() => {
    // Simulate the Puter CDN never delivering window.puter
    delete (window as any).puter;
    usePuterStore.setState({
      authStatus: "idle",
      isLoading: true,
      error: null,
      puterReady: false,
      puterLoadFailed: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("leaves the checking state after the 10 second CDN timeout", () => {
    vi.useFakeTimers();

    usePuterStore.getState().init();
    expect(usePuterStore.getState().authStatus).toBe("checking");

    vi.advanceTimersByTime(10_000);

    const state = usePuterStore.getState();
    expect(state.puterLoadFailed).toBe(true);
    expect(state.puterReady).toBe(false);
    expect(state.authStatus).toBe("unauthenticated");
    expect(state.isLoading).toBe(false);
    expect(state.error).toMatch(TIMEOUT_ERROR);
  });

  it("redirects to /auth and shows the CDN error instead of spinning forever", async () => {
    usePuterStore.setState({
      authStatus: "unauthenticated",
      isLoading: false,
      error:
        "Puter.js failed to load within 10 seconds. Check your connection and reload the page.",
      puterReady: false,
      puterLoadFailed: true,
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
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <div data-testid="protected-content">Private dashboard</div>
              </AuthGuard>
            }
          />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-login-button")).toBeInTheDocument();
    });

    expect(screen.getByText(TIMEOUT_ERROR)).toBeInTheDocument();
    expect(screen.queryByTestId("auth-guard-loading")).not.toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });
});
