import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ErrorBoundary } from "~/root";
import { telemetry } from "~/services/telemetry";

describe("ErrorBoundary Component (app/root.tsx)", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location.reload
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        reload: vi.fn(),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("renders branded 404 recovery card for 404 Route Error Responses", () => {
    const error404 = {
      status: 404,
      statusText: "Not Found",
      data: null,
      internal: true,
    };

    render(
      <MemoryRouter>
        <ErrorBoundary error={error404} params={{}} />
      </MemoryRouter>
    );

    // Header & Eyebrow
    expect(screen.getByText("Resumind Recovery")).toBeInTheDocument();
    expect(screen.getByText("404 Not Found")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Page Not Found" })).toBeInTheDocument();
    expect(
      screen.getByText("The page you are looking for does not exist or may have been moved.")
    ).toBeInTheDocument();

    // Recovery Actions
    const dashboardLink = screen.getByRole("link", { name: "Return to Dashboard" });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");

    const homeLink = screen.getByRole("link", { name: "Go to Home" });
    expect(homeLink).toHaveAttribute("href", "/");

    const reloadButton = screen.getByRole("button", { name: "Reload Application" });
    expect(reloadButton).toBeInTheDocument();
  });

  it("renders HTTP status and error details for server route errors (e.g., HTTP 500)", () => {
    const error500 = {
      status: 500,
      statusText: "Internal Server Error",
      data: "Gateway connection failed during analysis.",
      internal: true,
    };

    render(
      <MemoryRouter>
        <ErrorBoundary error={error500} params={{}} />
      </MemoryRouter>
    );

    expect(screen.getByText("HTTP 500")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Internal Server Error" })).toBeInTheDocument();
    expect(screen.getByText("Gateway connection failed during analysis.")).toBeInTheDocument();
  });

  it("renders graceful branded card for unhandled JavaScript exceptions", () => {
    const jsError = new TypeError("Cannot read properties of null (reading 'uuid')");

    render(
      <MemoryRouter>
        <ErrorBoundary error={jsError} params={{}} />
      </MemoryRouter>
    );

    expect(screen.getByText("TypeError")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Something Went Wrong" })).toBeInTheDocument();
    expect(
      screen.getByText("Cannot read properties of null (reading 'uuid')")
    ).toBeInTheDocument();
  });

  it("renders fallback messaging when given arbitrary non-error exceptions", () => {
    render(
      <MemoryRouter>
        <ErrorBoundary error="Custom fatal string payload" params={{}} />
      </MemoryRouter>
    );

    expect(screen.getByText("System Error")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Something Went Wrong" })).toBeInTheDocument();
    expect(screen.getByText("Custom fatal string payload")).toBeInTheDocument();
  });

  it("extracts name and message from custom error-like objects", () => {
    render(
      <MemoryRouter>
        <ErrorBoundary
          error={{ name: "PuterAuthError", message: "Puter session token rejected or expired." }}
          params={{}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("PuterAuthError")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Something Went Wrong" })).toBeInTheDocument();
    expect(screen.getByText("Puter session token rejected or expired.")).toBeInTheDocument();
  });

  it("triggers window.location.reload when 'Reload Application' is clicked", () => {
    const jsError = new Error("Render explosion");

    render(
      <MemoryRouter>
        <ErrorBoundary error={jsError} params={{}} />
      </MemoryRouter>
    );

    const reloadBtn = screen.getByRole("button", { name: "Reload Application" });
    fireEvent.click(reloadBtn);

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it("reports errors to telemetry with sanitized metadata upon mount", () => {
    const trackErrorSpy = vi.spyOn(telemetry, "trackError");
    const testError = new Error("Database timeout error");

    render(
      <MemoryRouter>
        <ErrorBoundary error={testError} params={{}} />
      </MemoryRouter>
    );

    expect(trackErrorSpy).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({
        boundary: "RootErrorBoundary",
        statusBadge: "Error",
        message: "Something Went Wrong",
        details: "Database timeout error",
      })
    );
  });
});
