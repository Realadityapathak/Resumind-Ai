import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useScrollReveal } from "~/hooks/useScrollReveal";

describe("useScrollReveal Hook (app/hooks/useScrollReveal.ts)", () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalIntersectionObserver: typeof window.IntersectionObserver;
  let observedElements: Element[] = [];
  let unobservedElements: Element[] = [];
  let disconnected = false;
  let observerCallback: IntersectionObserverCallback | null = null;

  beforeEach(() => {
    document.body.innerHTML = "";
    observedElements = [];
    unobservedElements = [];
    disconnected = false;
    observerCallback = null;

    originalMatchMedia = window.matchMedia;
    originalIntersectionObserver = window.IntersectionObserver;

    // Default matchMedia mock (no reduced motion)
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Mock IntersectionObserver using a proper class
    class MockIntersectionObserver {
      root = null;
      rootMargin = "0px";
      thresholds = [0];
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe = vi.fn((el: Element) => {
        observedElements.push(el);
      });
      unobserve = vi.fn((el: Element) => {
        unobservedElements.push(el);
      });
      disconnect = vi.fn(() => {
        disconnected = true;
      });
      takeRecords = vi.fn(() => []);
    }

    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof window.IntersectionObserver;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.IntersectionObserver = originalIntersectionObserver;
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("does nothing when no [data-reveal] elements exist", () => {
    const { unmount } = renderHook(() => useScrollReveal());
    expect(observedElements.length).toBe(0);
    unmount();
  });

  it("adds .is-in immediately when prefers-reduced-motion is active", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion: reduce"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const el1 = document.createElement("div");
    el1.setAttribute("data-reveal", "");
    const el2 = document.createElement("div");
    el2.setAttribute("data-reveal", "");
    document.body.appendChild(el1);
    document.body.appendChild(el2);

    renderHook(() => useScrollReveal());

    expect(el1.classList.contains("is-in")).toBe(true);
    expect(el2.classList.contains("is-in")).toBe(true);
    expect(el1.classList.contains("reveal-armed")).toBe(false);
    expect(observedElements.length).toBe(0);
  });

  it("adds .is-in immediately when IntersectionObserver is not supported in window", () => {
    // Delete IntersectionObserver
    // @ts-expect-error simulating legacy browser
    delete window.IntersectionObserver;

    const el = document.createElement("div");
    el.setAttribute("data-reveal", "");
    document.body.appendChild(el);

    renderHook(() => useScrollReveal());

    expect(el.classList.contains("is-in")).toBe(true);
    expect(el.classList.contains("reveal-armed")).toBe(false);
  });

  it("handles missing matchMedia gracefully and continues to observe elements", () => {
    // @ts-expect-error simulating browser without matchMedia
    delete window.matchMedia;

    const el = document.createElement("div");
    el.setAttribute("data-reveal", "");
    document.body.appendChild(el);

    renderHook(() => useScrollReveal());

    expect(el.classList.contains("reveal-armed")).toBe(true);
    expect(observedElements).toContain(el);
  });

  it("arms elements and observes them when IntersectionObserver is available", () => {
    const el1 = document.createElement("div");
    el1.setAttribute("data-reveal", "");
    const el2 = document.createElement("div");
    el2.setAttribute("data-reveal", "");
    document.body.appendChild(el1);
    document.body.appendChild(el2);

    renderHook(() => useScrollReveal());

    expect(el1.classList.contains("reveal-armed")).toBe(true);
    expect(el2.classList.contains("reveal-armed")).toBe(true);
    expect(observedElements).toContain(el1);
    expect(observedElements).toContain(el2);
  });

  it("reveals elements and unobserves them when they intersect", () => {
    const el = document.createElement("div");
    el.setAttribute("data-reveal", "");
    document.body.appendChild(el);

    renderHook(() => useScrollReveal());

    expect(observerCallback).not.toBeNull();

    // Fire non-intersecting entry
    observerCallback!(
      [
        {
          target: el,
          isIntersecting: false,
          intersectionRatio: 0,
        } as unknown as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver
    );
    expect(el.classList.contains("is-in")).toBe(false);
    expect(unobservedElements).not.toContain(el);

    // Fire intersecting entry
    observerCallback!(
      [
        {
          target: el,
          isIntersecting: true,
          intersectionRatio: 0.5,
        } as unknown as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver
    );
    expect(el.classList.contains("is-in")).toBe(true);
    expect(unobservedElements).toContain(el);
  });

  it("applies fallback reveals after 1200ms timeout for visible elements", () => {
    vi.useFakeTimers();

    const inViewEl = document.createElement("div");
    inViewEl.setAttribute("data-reveal", "");
    inViewEl.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      bottom: 300,
    });

    const outOfViewEl = document.createElement("div");
    outOfViewEl.setAttribute("data-reveal", "");
    outOfViewEl.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 2000,
      bottom: 2500,
    });

    document.body.appendChild(inViewEl);
    document.body.appendChild(outOfViewEl);

    renderHook(() => useScrollReveal());

    expect(inViewEl.classList.contains("is-in")).toBe(false);
    expect(outOfViewEl.classList.contains("is-in")).toBe(false);

    vi.advanceTimersByTime(1200);

    expect(inViewEl.classList.contains("is-in")).toBe(true);
    expect(outOfViewEl.classList.contains("is-in")).toBe(false);
  });

  it("cleans up observer and cancels fallback timer on unmount", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    const el = document.createElement("div");
    el.setAttribute("data-reveal", "");
    document.body.appendChild(el);

    const { unmount } = renderHook(() => useScrollReveal());

    unmount();

    expect(disconnected).toBe(true);
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
