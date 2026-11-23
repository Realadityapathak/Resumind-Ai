import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Link } from "react-router";
import Sidebar from "~/components/layout/Sidebar";
import { usePuterStore } from "~/services/puter/store";

describe("<Sidebar /> Component", () => {
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    usePuterStore.setState({
      authStatus: "authenticated",
      puterReady: true,
      isLoading: false,
      auth: {
        user: { uuid: "user_456", username: "alexdev" },
        isAuthenticated: true,
        authStatus: "authenticated",
        signIn: vi.fn(),
        signOut: mockSignOut,
        refreshUser: vi.fn(),
        checkAuthStatus: vi.fn(async () => true),
        getUser: () => ({ uuid: "user_456", username: "alexdev" }),
      },
    });
  });

  it("renders all four primary navigation links in expanded mode", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar initialCollapsed={false} />
      </MemoryRouter>
    );

    expect(screen.getByText("RESUMIND")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("AI Workspace")).toBeInTheDocument();
    expect(screen.getByText("Analyze Resume")).toBeInTheDocument();
    expect(screen.getByText("Profile & Settings")).toBeInTheDocument();
  });

  it("highlights the active route based on the current location pathname", () => {
    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <Sidebar initialCollapsed={false} />
      </MemoryRouter>
    );

    const workspaceLink = screen.getByRole("link", { name: /AI Workspace/i });
    expect(workspaceLink.className).toContain("bg-blue-50");
    expect(workspaceLink.className).toContain("text-blue-700");
  });

  it("toggles collapse state when clicking the expand/collapse button", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar initialCollapsed={false} />
      </MemoryRouter>
    );

    const aside = screen.getByTestId("sidebar-container");
    expect(aside.className).toContain("w-64");

    const toggleBtn = screen.getByLabelText(/collapse sidebar/i);
    fireEvent.click(toggleBtn);

    expect(aside.className).toContain("w-20");
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("displays Puter Cloud status heartbeat and authenticated username", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar initialCollapsed={false} />
      </MemoryRouter>
    );

    expect(screen.getByText("Puter Cloud")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("@alexdev")).toBeInTheDocument();
  });

  it("triggers auth.signOut when Sign Out button is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar initialCollapsed={false} />
      </MemoryRouter>
    );

    const signOutBtn = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(signOutBtn);

    expect(mockSignOut).toHaveBeenCalled();
  });

  describe("Adversarial Stress Testing & Route Synchronization", () => {
    it("synchronizes active link highlight dynamically across multiple route changes", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Sidebar />
          <nav>
            <Link to="/workspace" data-testid="goto-workspace">To Workspace</Link>
            <Link to="/resume/res_999" data-testid="goto-resume">To Specific Resume</Link>
            <Link to="/upload" data-testid="goto-upload">To Upload</Link>
            <Link to="/profile" data-testid="goto-profile">To Profile</Link>
          </nav>
        </MemoryRouter>
      );

      const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
      const workspaceLink = screen.getByRole("link", { name: /AI Workspace/i });
      const uploadLink = screen.getByRole("link", { name: "Analyze Resume" });
      const profileLink = screen.getByRole("link", { name: "Profile & Settings" });

      // Initially on /dashboard
      expect(dashboardLink.className).toContain("bg-blue-50 text-blue-700");
      expect(workspaceLink.className).not.toContain("bg-blue-50 text-blue-700");

      // Navigate to /workspace
      fireEvent.click(screen.getByTestId("goto-workspace"));
      expect(workspaceLink.className).toContain("bg-blue-50 text-blue-700");
      expect(dashboardLink.className).not.toContain("bg-blue-50 text-blue-700");

      // Navigate to /resume/res_999 (should also activate AI Workspace)
      fireEvent.click(screen.getByTestId("goto-resume"));
      expect(workspaceLink.className).toContain("bg-blue-50 text-blue-700");

      // Navigate to /upload
      fireEvent.click(screen.getByTestId("goto-upload"));
      expect(uploadLink.className).toContain("bg-blue-50 text-blue-700");
      expect(workspaceLink.className).not.toContain("bg-blue-50 text-blue-700");

      // Navigate to /profile
      fireEvent.click(screen.getByTestId("goto-profile"));
      expect(profileLink.className).toContain("bg-blue-50 text-blue-700");
      expect(uploadLink.className).not.toContain("bg-blue-50 text-blue-700");
    });

    it("handles rapid collapse toggles without state corruption or desynchronization", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Sidebar initialCollapsed={false} />
        </MemoryRouter>
      );

      const aside = screen.getByTestId("sidebar-container");
      const toggleBtn = screen.getByTitle(/collapse sidebar/i);

      // Rapidly toggle 10 times
      for (let i = 0; i < 10; i++) {
        fireEvent.click(toggleBtn);
      }

      // Even number of clicks returns to original expanded state
      expect(aside.className).toContain("w-64");
      expect(screen.getByText("Dashboard")).toBeInTheDocument();

      // Odd click collapses
      fireEvent.click(toggleBtn);
      expect(aside.className).toContain("w-20");
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    });

    it("handles Sign Out from collapsed mode correctly", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Sidebar initialCollapsed={true} />
        </MemoryRouter>
      );

      const collapsedSignOutBtn = screen.getByTitle("Sign Out");
      fireEvent.click(collapsedSignOutBtn);

      expect(mockSignOut).toHaveBeenCalled();
    });

    it("handles rapid window resize events without breaking layout state", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Sidebar initialCollapsed={false} />
        </MemoryRouter>
      );

      act(() => {
        for (let i = 0; i < 15; i++) {
          window.innerWidth = i % 2 === 0 ? 375 : 1440;
          window.dispatchEvent(new Event("resize"));
        }
      });

      const aside = screen.getByTestId("sidebar-container");
      expect(aside).toBeInTheDocument();
      expect(aside.className).toContain("w-64");
    });
  });
});
