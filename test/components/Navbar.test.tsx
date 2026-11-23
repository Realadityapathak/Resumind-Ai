import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Link } from "react-router";
import Navbar from "~/components/layout/Navbar";
import { usePuterStore } from "~/services/puter/store";

describe("<Navbar /> Component", () => {
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Unauthenticated Navigation", () => {
    beforeEach(() => {
      usePuterStore.setState({
        authStatus: "unauthenticated",
        puterReady: true,
        isLoading: false,
        auth: {
          user: null,
          isAuthenticated: false,
          authStatus: "unauthenticated",
          signIn: vi.fn(),
          signOut: mockSignOut,
          refreshUser: vi.fn(),
          checkAuthStatus: vi.fn(async () => false),
          getUser: () => null,
        },
      });
    });

    it("renders brand logo, marketing anchor links, Sign In button, and Get Started CTA", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar />
        </MemoryRouter>
      );

      expect(screen.getByText("RESUMIND")).toBeInTheDocument();
      expect(screen.getByText("Features")).toBeInTheDocument();
      expect(screen.getByText("How It Works")).toBeInTheDocument();
      expect(screen.getByText("Testimonials")).toBeInTheDocument();
      expect(screen.getByText("FAQ")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
        "href",
        "/auth?next=/dashboard"
      );
      expect(screen.getByRole("link", { name: /get started free/i })).toHaveAttribute(
        "href",
        "/upload"
      );
    });

    it("opens and closes mobile navigation drawer via hamburger button and close button", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar />
        </MemoryRouter>
      );

      expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();

      const hamburgerBtn = screen.getByLabelText(/toggle navigation menu/i);
      fireEvent.click(hamburgerBtn);

      expect(screen.getByTestId("mobile-menu-drawer")).toBeInTheDocument();

      const closeBtn = screen.getByLabelText(/close menu/i);
      fireEvent.click(closeBtn);

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
  });

  describe("Authenticated Navigation", () => {
    beforeEach(() => {
      usePuterStore.setState({
        authStatus: "authenticated",
        puterReady: true,
        isLoading: false,
        auth: {
          user: { uuid: "user_789", username: "sarahj" },
          isAuthenticated: true,
          authStatus: "authenticated",
          signIn: vi.fn(),
          signOut: mockSignOut,
          refreshUser: vi.fn(),
          checkAuthStatus: vi.fn(async () => true),
          getUser: () => ({ uuid: "user_789", username: "sarahj" }),
        },
      });
    });

    it("renders Dashboard, AI Workspace, Profile links and user avatar with username", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Navbar />
        </MemoryRouter>
      );

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("AI Workspace")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("@sarahj")).toBeInTheDocument();
      expect(screen.getByText("SA")).toBeInTheDocument(); // Initials
    });

    it("toggles user avatar dropdown on click and executes Sign Out", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Navbar />
        </MemoryRouter>
      );

      expect(screen.queryByTestId("user-dropdown-menu")).not.toBeInTheDocument();

      const userBtn = screen.getByLabelText(/user menu/i);
      fireEvent.click(userBtn);

      expect(screen.getByTestId("user-dropdown-menu")).toBeInTheDocument();
      expect(screen.getByText("Signed in as")).toBeInTheDocument();

      const signOutBtn = screen.getByRole("button", { name: /sign out/i });
      fireEvent.click(signOutBtn);

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe("Adversarial Stress Testing & Responsive Interactions", () => {
    beforeEach(() => {
      usePuterStore.setState({
        authStatus: "authenticated",
        puterReady: true,
        isLoading: false,
        auth: {
          user: { uuid: "user_789", username: "sarahj" },
          isAuthenticated: true,
          authStatus: "authenticated",
          signIn: vi.fn(),
          signOut: mockSignOut,
          refreshUser: vi.fn(),
          checkAuthStatus: vi.fn(async () => true),
          getUser: () => ({ uuid: "user_789", username: "sarahj" }),
        },
      });
    });

    it("handles rapid mobile hamburger toggles without desynchronization", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Navbar />
        </MemoryRouter>
      );

      const toggleBtn = screen.getByLabelText(/toggle navigation menu/i);

      // Rapidly toggle 5 times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(toggleBtn);
      }

      // Odd number of clicks -> drawer should be open
      expect(screen.getByTestId("mobile-menu-drawer")).toBeInTheDocument();

      // 6th click -> drawer should close
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();
    });

    it("handles backdrop clicks to dismiss mobile navigation drawer", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Navbar />
        </MemoryRouter>
      );

      const toggleBtn = screen.getByLabelText(/toggle navigation menu/i);
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId("mobile-menu-drawer")).toBeInTheDocument();

      const backdrop = screen.getByTestId("mobile-menu-backdrop");
      fireEvent.click(backdrop);

      expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();
    });

    it("dismisses user dropdown on outside mousedown clicks", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Navbar />
        </MemoryRouter>
      );

      const userBtn = screen.getByLabelText(/user menu/i);
      fireEvent.click(userBtn);
      expect(screen.getByTestId("user-dropdown-menu")).toBeInTheDocument();

      // Mousedown outside the dropdown ref
      fireEvent.mouseDown(document.body);
      expect(screen.queryByTestId("user-dropdown-menu")).not.toBeInTheDocument();
    });

    it("handles Escape key dismiss for both mobile drawer and dropdown while ignoring non-Escape keys", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Navbar />
        </MemoryRouter>
      );

      // 1. Dropdown escape test
      const userBtn = screen.getByLabelText(/user menu/i);
      fireEvent.click(userBtn);
      expect(screen.getByTestId("user-dropdown-menu")).toBeInTheDocument();

      // Non-escape keys should not close
      fireEvent.keyDown(window, { key: "Enter" });
      fireEvent.keyDown(window, { key: "Tab" });
      fireEvent.keyDown(window, { key: "ArrowDown" });
      expect(screen.getByTestId("user-dropdown-menu")).toBeInTheDocument();

      // Escape key closes
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("user-dropdown-menu")).not.toBeInTheDocument();

      // 2. Mobile drawer escape test
      const toggleBtn = screen.getByLabelText(/toggle navigation menu/i);
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId("mobile-menu-drawer")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Space" });
      expect(screen.getByTestId("mobile-menu-drawer")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();
    });

    it("handles rapid window resize events without throwing errors or breaking state", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Navbar />
        </MemoryRouter>
      );

      // Dispatch rapid window resize events with different window dimensions
      act(() => {
        for (let i = 0; i < 20; i++) {
          window.innerWidth = i % 2 === 0 ? 375 : 1280;
          window.dispatchEvent(new Event("resize"));
        }
      });

      // Navbar should remain fully intact
      expect(screen.getByText("RESUMIND")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("synchronizes active route highlighting across location changes and automatically closes open drawers", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Navbar />
          <nav>
            <Link to="/workspace" data-testid="nav-to-workspace">Go to Workspace</Link>
            <Link to="/profile" data-testid="nav-to-profile">Go to Profile</Link>
          </nav>
        </MemoryRouter>
      );

      // Initially on /dashboard
      const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
      const workspaceLink = screen.getByRole("link", { name: "AI Workspace" });
      const profileLink = screen.getByRole("link", { name: "Profile" });

      expect(dashboardLink.className).toContain("text-blue-600");
      expect(workspaceLink.className).not.toContain("text-blue-600");

      // Open mobile drawer
      const toggleBtn = screen.getByLabelText(/toggle navigation menu/i);
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId("mobile-menu-drawer")).toBeInTheDocument();

      // Navigate to /workspace
      fireEvent.click(screen.getByTestId("nav-to-workspace"));

      // Drawer should have automatically closed on route change
      expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();

      // Active styling should now highlight AI Workspace
      expect(workspaceLink.className).toContain("text-blue-600");
      expect(dashboardLink.className).not.toContain("text-blue-600");

      // Navigate to /profile
      fireEvent.click(screen.getByTestId("nav-to-profile"));
      expect(profileLink.className).toContain("text-blue-600");
      expect(workspaceLink.className).not.toContain("text-blue-600");
    });
  });
});
