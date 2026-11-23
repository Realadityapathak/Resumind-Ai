import { useEffect, useLayoutEffect } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" && typeof document !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Arms `[data-reveal]` elements and reveals them once as they cross into view.
 *
 * Safety rules:
 * - Without an IntersectionObserver (or with reduced motion), nothing is hidden.
 * - Arming happens in a layout effect so there is no flash of already-visible content.
 * - An element is unobserved after it arrives, so a reveal never replays.
 */
export function useScrollReveal() {
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (elements.length === 0) return;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hasObserver = "IntersectionObserver" in window;

    if (prefersReducedMotion || !hasObserver) {
      elements.forEach((element) => element.classList.add("is-in"));
      return;
    }

    elements.forEach((element) => element.classList.add("reveal-armed"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );

    elements.forEach((element) => observer.observe(element));

    // If the observer cannot deliver (unusual embedding), reveal anything
    // already on screen rather than leaving a blank band.
    const fallback = window.setTimeout(() => {
      for (const element of elements) {
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          element.classList.add("is-in");
        }
      }
    }, 1200);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);
}
