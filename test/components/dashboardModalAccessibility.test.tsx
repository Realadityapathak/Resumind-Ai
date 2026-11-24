import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Dashboard from "~/routes/dashboard";
import { puterMock, resetPuterMock, seedPuterKV } from "../mocks/puterMock";
import { usePuterStore } from "~/services/puter/store";

describe("Dashboard Delete Confirmation Modal Accessibility (WCAG 2.1 AA Dialog)", () => {
    beforeEach(async () => {
        resetPuterMock();
        (window as any).puter = puterMock;
        (globalThis as any).puter = puterMock;

        await puterMock.fs.write("resumes/doc-1.pdf", "mock-content");
        await puterMock.fs.write("resumes/img-1.png", "mock-thumb");

        seedPuterKV({
            "resume:test-a11y-1": {
                id: "test-a11y-1",
                companyName: "Vercel",
                jobTitle: "Edge Engineer",
                fileName: "vercel_edge.pdf",
                resumePath: "resumes/doc-1.pdf",
                imagePath: "resumes/img-1.png",
                createdAt: "2026-11-20T10:00:00.000Z",
                feedback: {
                    overallScore: 89,
                    ATS: { score: 90, tips: [] },
                    content: { score: 85, tips: [] },
                    structure: { score: 90, tips: [] },
                    skills: { score: 88, tips: [] },
                    toneAndStyle: { score: 85, tips: [] },
                },
            },
        });

        usePuterStore.setState({
            authStatus: "authenticated",
            puterReady: true,
            isLoading: false,
            auth: {
                user: { uuid: "user-1", username: "alex" },
                isAuthenticated: true,
                authStatus: "authenticated",
                signIn: vi.fn(),
                signOut: vi.fn(),
                refreshUser: vi.fn(),
                checkAuthStatus: vi.fn(async () => true),
                getUser: () => ({ uuid: "user-1", username: "alex" }),
            },
        });
    });

    it("automatically focuses the Cancel button when the Delete Confirmation modal opens", async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText("Vercel")).toBeInTheDocument());

        const deleteBtn = screen.getByTestId("delete-btn-test-a11y-1");
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const cancelBtn = screen.getByRole("button", { name: "Cancel" });
        await waitFor(() => {
            expect(document.activeElement).toBe(cancelBtn);
        });
    });

    it("dismisses the modal when pressing the Escape key", async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText("Vercel")).toBeInTheDocument());

        const deleteBtn = screen.getByTestId("delete-btn-test-a11y-1");
        fireEvent.click(deleteBtn);

        expect(screen.getByRole("dialog")).toBeInTheDocument();

        fireEvent.keyDown(window, { key: "Escape" });

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("traps keyboard focus within modal buttons on Tab and Shift+Tab", async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText("Vercel")).toBeInTheDocument());

        const deleteBtn = screen.getByTestId("delete-btn-test-a11y-1");
        fireEvent.click(deleteBtn);

        const modal = screen.getByRole("dialog");
        const cancelBtn = within(modal).getByRole("button", { name: "Cancel" });
        const confirmBtn = within(modal).getByRole("button", { name: /confirm delete/i });

        // Focus cancel button
        cancelBtn.focus();
        expect(document.activeElement).toBe(cancelBtn);

        // Press Shift+Tab on first element -> wraps to last element (confirm button)
        fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
        expect(document.activeElement).toBe(confirmBtn);

        // Press Tab on last element -> wraps to first element (cancel button)
        fireEvent.keyDown(window, { key: "Tab", shiftKey: false });
        expect(document.activeElement).toBe(cancelBtn);
    });

    it("restores focus to the originating trigger button when the modal closes", async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText("Vercel")).toBeInTheDocument());

        const deleteBtn = screen.getByTestId("delete-btn-test-a11y-1");
        deleteBtn.focus();
        expect(document.activeElement).toBe(deleteBtn);

        fireEvent.click(deleteBtn);
        expect(screen.getByRole("dialog")).toBeInTheDocument();

        // Dismiss modal via Escape key
        fireEvent.keyDown(window, { key: "Escape" });

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        // Focus should be restored to originating trigger button
        expect(document.activeElement).toBe(deleteBtn);
    });

    it("prevents Escape dismissal and retains modal focus during active deletion", async () => {
        // Delay Puter KV / FS deletion to observe in-flight deleting state
        let resolveDelete: any;
        const pendingPromise = new Promise((resolve) => {
            resolveDelete = resolve;
        });
        vi.spyOn(puterMock.fs, "delete").mockReturnValue(pendingPromise as any);

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText("Vercel")).toBeInTheDocument());

        const deleteBtn = screen.getByTestId("delete-btn-test-a11y-1");
        fireEvent.click(deleteBtn);

        const modal = screen.getByRole("dialog");
        const confirmBtn = within(modal).getByRole("button", { name: /confirm delete/i });

        fireEvent.click(confirmBtn);

        // While deleting is in-progress:
        // Pressing Escape should NOT close the dialog
        fireEvent.keyDown(window, { key: "Escape" });
        expect(screen.getByRole("dialog")).toBeInTheDocument();

        // Resolve the in-flight deletion
        resolveDelete(true);

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });
});
