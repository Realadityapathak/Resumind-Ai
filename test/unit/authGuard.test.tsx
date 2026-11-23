import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import AuthGuard, { AuthGuard as NamedAuthGuard } from "~/components/auth/AuthGuard";
import { AuthGuard as AuthGuardFromSubdir } from "~/components/auth/AuthGuard";
import Auth from "~/routes/auth";
import { usePuterStore, type AuthStatus } from "~/services/puter/store";

// Helper component to track and assert current route location
function LocationTracker() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname + location.search + location.hash}</div>;
}

// Utility to set mock state on the zustand store
function setStoreAuthState(params: {
  authStatus: AuthStatus;
  puterReady: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  user?: any;
}) {
  usePuterStore.setState({
    authStatus: params.authStatus,
    puterReady: params.puterReady,
    puterLoadFailed: false,
    isLoading: params.isLoading,
    auth: {
      user: params.user || null,
      isAuthenticated: params.isAuthenticated,
      authStatus: params.authStatus,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
      checkAuthStatus: vi.fn().mockResolvedValue(params.isAuthenticated),
      getUser: () => params.user || null,
    },
  });
}

describe("<AuthGuard /> Component & Route Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading & Initialization States", () => {
    it("renders branded loading skeleton when authStatus is 'checking'", () => {
      setStoreAuthState({
        authStatus: "checking",
        puterReady: true,
        isLoading: true,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthGuard>
            <div data-testid="protected-content">Dashboard Protected Area</div>
          </AuthGuard>
        </MemoryRouter>
      );

      expect(screen.getByTestId("auth-guard-loading")).toBeInTheDocument();
      expect(screen.getByText("Verifying Resumind Session")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("renders branded loading skeleton when authStatus is 'idle'", () => {
      setStoreAuthState({
        authStatus: "idle",
        puterReady: false,
        isLoading: true,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthGuard>
            <div data-testid="protected-content">Dashboard Protected Area</div>
          </AuthGuard>
        </MemoryRouter>
      );

      expect(screen.getByTestId("auth-guard-loading")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("renders branded loading skeleton when puterReady is false, preventing premature redirects", () => {
      // Even if isAuthenticated is initially false, if puterReady is false, no redirect should occur
      setStoreAuthState({
        authStatus: "unauthenticated",
        puterReady: false,
        isLoading: true,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <LocationTracker />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <div data-testid="protected-content">Dashboard Area</div>
                </AuthGuard>
              }
            />
            <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Loading skeleton must be displayed, NO navigation to /auth
      expect(screen.getByTestId("auth-guard-loading")).toBeInTheDocument();
      expect(screen.getByTestId("current-location")).toHaveTextContent("/dashboard");
      expect(screen.queryByTestId("auth-page")).not.toBeInTheDocument();
    });

    it("renders custom fallback prop when provided during checking state", () => {
      setStoreAuthState({
        authStatus: "checking",
        puterReady: true,
        isLoading: true,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthGuard fallback={<div data-testid="custom-spinner">Custom Spinner Loading...</div>}>
            <div data-testid="protected-content">Protected Content</div>
          </AuthGuard>
        </MemoryRouter>
      );

      expect(screen.getByTestId("custom-spinner")).toBeInTheDocument();
      expect(screen.queryByTestId("auth-guard-loading")).not.toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("Unauthenticated Access & Redirection", () => {
    it("redirects unauthenticated visitors to /auth with encoded current pathname", async () => {
      setStoreAuthState({
        authStatus: "unauthenticated",
        puterReady: true,
        isLoading: false,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <LocationTracker />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <div data-testid="protected-content">Dashboard Area</div>
                </AuthGuard>
              }
            />
            <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("auth-page")).toBeInTheDocument();
      });

      expect(screen.getByTestId("current-location")).toHaveTextContent("/auth?next=%2Fdashboard");
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("preserves deep paths, query parameters, and hash anchors in redirect target", async () => {
      setStoreAuthState({
        authStatus: "unauthenticated",
        puterReady: true,
        isLoading: false,
        isAuthenticated: false,
      });

      const initialUrl = "/workspace?tab=star-rewriter&filter=impact#preview";

      render(
        <MemoryRouter initialEntries={[initialUrl]}>
          <LocationTracker />
          <Routes>
            <Route
              path="/workspace"
              element={
                <AuthGuard>
                  <div data-testid="protected-content">Workspace Area</div>
                </AuthGuard>
              }
            />
            <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("auth-page")).toBeInTheDocument();
      });

      const expectedNext = encodeURIComponent(initialUrl);
      expect(screen.getByTestId("current-location")).toHaveTextContent(`/auth?next=${expectedNext}`);
    });

    it("respects custom redirectTo prop override", async () => {
      setStoreAuthState({
        authStatus: "unauthenticated",
        puterReady: true,
        isLoading: false,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={["/profile"]}>
          <LocationTracker />
          <Routes>
            <Route
              path="/profile"
              element={
                <AuthGuard redirectTo="/custom-login">
                  <div data-testid="protected-content">Profile Area</div>
                </AuthGuard>
              }
            />
            <Route path="/custom-login" element={<div data-testid="custom-login-page">Custom Login</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("custom-login-page")).toBeInTheDocument();
      });

      expect(screen.getByTestId("current-location")).toHaveTextContent("/custom-login");
    });
  });

  describe("Authenticated Access", () => {
    it("seamlessly renders protected children when authenticated", () => {
      setStoreAuthState({
        authStatus: "authenticated",
        puterReady: true,
        isLoading: false,
        isAuthenticated: true,
        user: { uuid: "user_123", username: "alex_dev" },
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthGuard>
            <div data-testid="protected-content">Confidential Dashboard Data</div>
          </AuthGuard>
        </MemoryRouter>
      );

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      expect(screen.getByText("Confidential Dashboard Data")).toBeInTheDocument();
      expect(screen.queryByTestId("auth-guard-loading")).not.toBeInTheDocument();
    });
  });

  describe("Dynamic State Transitions", () => {
    it("transitions seamlessly from checking to authenticated when verification resolves", async () => {
      // 1. Initial State: Checking
      setStoreAuthState({
        authStatus: "checking",
        puterReady: true,
        isLoading: true,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthGuard>
            <div data-testid="protected-content">Ready Content</div>
          </AuthGuard>
        </MemoryRouter>
      );

      expect(screen.getByTestId("auth-guard-loading")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();

      // 2. Action: Authentication resolves successfully
      act(() => {
        setStoreAuthState({
          authStatus: "authenticated",
          puterReady: true,
          isLoading: false,
          isAuthenticated: true,
          user: { uuid: "user_999", username: "verified_user" },
        });
      });

      // 3. Assertion: Children become visible
      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("auth-guard-loading")).not.toBeInTheDocument();
    });

    it("transitions seamlessly from checking to unauthenticated and triggers redirect", async () => {
      // 1. Initial State: Checking
      setStoreAuthState({
        authStatus: "checking",
        puterReady: true,
        isLoading: true,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <LocationTracker />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <div data-testid="protected-content">Protected Content</div>
                </AuthGuard>
              }
            />
            <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("auth-guard-loading")).toBeInTheDocument();

      // 2. Action: Check completes, user is unauthenticated
      act(() => {
        setStoreAuthState({
          authStatus: "unauthenticated",
          puterReady: true,
          isLoading: false,
          isAuthenticated: false,
        });
      });

      // 3. Assertion: Redirect to /auth occurs
      await waitFor(() => {
        expect(screen.getByTestId("auth-page")).toBeInTheDocument();
      });
      expect(screen.getByTestId("current-location")).toHaveTextContent("/auth?next=%2Fdashboard");
    });
  });

  describe("Re-export Ergonomics", () => {
    it("ensures both ~/components/auth/AuthGuard and ~/components/auth/AuthGuard export identically", () => {
      expect(AuthGuard).toBe(NamedAuthGuard);
      expect(AuthGuard).toBe(AuthGuardFromSubdir);
    });
  });

  describe("Adversarial Stress Testing & Edge Transitions", () => {
    it("handles rapid in-flight state resolution without premature redirect when puterReady resolves after authStatus", async () => {
      // Start in 'checking' with puterReady: false
      setStoreAuthState({
        authStatus: "checking",
        puterReady: false,
        isLoading: true,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <LocationTracker />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <div data-testid="protected-content">Secret Content</div>
                </AuthGuard>
              }
            />
            <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("auth-guard-loading")).toBeInTheDocument();

      // State momentarily flips to unauthenticated while still loading
      act(() => {
        setStoreAuthState({
          authStatus: "unauthenticated",
          puterReady: false,
          isLoading: true,
          isAuthenticated: false,
        });
      });

      // Still loading, so no premature redirect to /auth
      expect(screen.getByTestId("auth-guard-loading")).toBeInTheDocument();
      expect(screen.getByTestId("current-location")).toHaveTextContent("/dashboard");

      // State immediately resolves to authenticated
      act(() => {
        setStoreAuthState({
          authStatus: "authenticated",
          puterReady: true,
          isLoading: false,
          isAuthenticated: true,
          user: { uuid: "fast_user", username: "flash" },
        });
      });

      // Protected content renders directly without navigating to /auth
      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });
      expect(screen.getByTestId("current-location")).toHaveTextContent("/dashboard");
    });

    it("handles rapid state transitions through full Auth lifecycle (checking -> unauthenticated -> authenticated) with safe return", async () => {
      // Start in 'checking'
      setStoreAuthState({
        authStatus: "checking",
        puterReady: true,
        isLoading: true,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <LocationTracker />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <div data-testid="protected-content">Secret Content</div>
                </AuthGuard>
              }
            />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("auth-guard-loading")).toBeInTheDocument();

      // 1. Unauthenticated transition triggers AuthGuard redirect to /auth
      act(() => {
        setStoreAuthState({
          authStatus: "unauthenticated",
          puterReady: true,
          isLoading: false,
          isAuthenticated: false,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("current-location")).toHaveTextContent("/auth?next=%2Fdashboard");
      });

      // 2. User successfully authenticates at /auth
      act(() => {
        setStoreAuthState({
          authStatus: "authenticated",
          puterReady: true,
          isLoading: false,
          isAuthenticated: true,
          user: { uuid: "fast_user", username: "flash" },
        });
      });

      // 3. Auth component automatically redirects back to /dashboard and AuthGuard renders protected content
      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });
      expect(screen.getByTestId("current-location")).toHaveTextContent("/dashboard");
    });

    it("handles rapid flip-flopping across states without throwing unhandled exceptions", async () => {
      setStoreAuthState({
        authStatus: "idle",
        puterReady: false,
        isLoading: true,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <LocationTracker />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <div data-testid="flip-content">Flip Content</div>
                </AuthGuard>
              }
            />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </MemoryRouter>
      );

      // Rapidly transition across multiple lifecycle states
      const cycles: { status: AuthStatus; ready: boolean; auth: boolean }[] = [
        { status: "checking", ready: true, auth: false },
        { status: "unauthenticated", ready: true, auth: false },
        { status: "checking", ready: true, auth: false },
        { status: "authenticated", ready: true, auth: true },
      ];

      for (const item of cycles) {
        act(() => {
          setStoreAuthState({
            authStatus: item.status,
            puterReady: item.ready,
            isLoading: item.status === "checking",
            isAuthenticated: item.auth,
            user: item.auth ? { uuid: "u1", username: "alex" } : null,
          });
        });
      }

      // Final authenticated state must resolve cleanly to protected content without unhandled crashes
      await waitFor(() => {
        expect(screen.getByTestId("flip-content")).toBeInTheDocument();
      });
    });

    it("verifies end-to-end query parameter and hash anchor retention for ?next=/dashboard?tab=star&focus=123#metrics", async () => {
      setStoreAuthState({
        authStatus: "unauthenticated",
        puterReady: true,
        isLoading: false,
        isAuthenticated: false,
      });

      const complexUrl = "/dashboard?tab=star&focus=123#metrics";

      render(
        <MemoryRouter initialEntries={[complexUrl]}>
          <LocationTracker />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <div data-testid="protected-content">Content</div>
                </AuthGuard>
              }
            />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </MemoryRouter>
      );

      // 1. Guard encodes the full URL including search params and hash
      await waitFor(() => {
        const expectedEncoded = encodeURIComponent(complexUrl);
        expect(screen.getByTestId("current-location")).toHaveTextContent(`/auth?next=${expectedEncoded}`);
      });

      // 2. Authenticate
      act(() => {
        setStoreAuthState({
          authStatus: "authenticated",
          puterReady: true,
          isLoading: false,
          isAuthenticated: true,
          user: { uuid: "u1", username: "alex" },
        });
      });

      // 3. Auth page parses next and returns user back to the exact complexUrl
      await waitFor(() => {
        expect(screen.getByTestId("current-location")).toHaveTextContent(complexUrl);
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });
    });

    it("handles back-button and history transitions without unhandled exceptions", async () => {
      setStoreAuthState({
        authStatus: "authenticated",
        puterReady: true,
        isLoading: false,
        isAuthenticated: true,
        user: { uuid: "u1", username: "alex" },
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={["/dashboard", "/dashboard?tab=star&focus=123#metrics"]} initialIndex={1}>
          <LocationTracker />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <div data-testid="guarded-area">Guarded Dashboard</div>
                </AuthGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("guarded-area")).toBeInTheDocument();
      expect(screen.getByTestId("current-location")).toHaveTextContent("/dashboard?tab=star&focus=123#metrics");

      // Unmounting during active guard should not throw errors or trigger state leaks
      expect(() => unmount()).not.toThrow();
    });
  });
});
