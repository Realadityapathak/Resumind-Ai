import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Navbar from "~/components/layout/Navbar";
import { usePuterStore } from "~/services/puter/store";

describe("Navbar Desktop Deduplication (variant='shell' & hideNavLinks)", () => {
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
                signOut: vi.fn(),
                refreshUser: vi.fn(),
                checkAuthStatus: vi.fn(async () => true),
                getUser: () => ({ uuid: "user_789", username: "sarahj" }),
            },
        });
    });

    it("hides duplicate desktop navigation links when variant='shell' is specified", () => {
        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <Navbar variant="shell" />
            </MemoryRouter>
        );

        // Desktop nav links should not exist in the document
        expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "AI Workspace" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();

        // But Brand, Actions, and User Menu remain
        expect(screen.getByText("RESUMIND")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /upload resume/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/user menu/i)).toBeInTheDocument();
        expect(screen.getByText("@sarahj")).toBeInTheDocument();
        expect(screen.getByLabelText(/toggle navigation menu/i)).toBeInTheDocument();
    });

    it("hides duplicate desktop navigation links when hideNavLinks={true} is passed", () => {
        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <Navbar hideNavLinks />
            </MemoryRouter>
        );

        expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "AI Workspace" })).not.toBeInTheDocument();
        expect(screen.getByText("RESUMIND")).toBeInTheDocument();
    });

    it("renders desktop navigation links normally when default variant is used", () => {
        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <Navbar />
            </MemoryRouter>
        );

        expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "AI Workspace" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    });
});
