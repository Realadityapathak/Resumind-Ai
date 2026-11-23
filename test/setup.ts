import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Automatically cleanup DOM after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Polyfill window.URL methods for jsdom
if (typeof window !== "undefined") {
  // Vitest 4 installs a jsdom-compat URL.createObjectURL that expects Node's
  // Blob internals (`blob[implSymbol]._buffer`) and throws for jsdom Blobs.
  // Always replace it with deterministic mocks so components can create and
  // revoke object URLs under test.
  window.URL.createObjectURL = vi.fn((_blob: Blob | MediaSource) => "blob:mock-object-url");
  window.URL.revokeObjectURL = vi.fn();

  // Polyfill window.matchMedia for jsdom
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  // Polyfill ResizeObserver
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  }

  // Polyfill HTMLCanvasElement getContext and toBlob for headless jsdom testing
  if (typeof HTMLCanvasElement !== "undefined") {
    HTMLCanvasElement.prototype.getContext = vi.fn(function () {
      return {
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8Array() })),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
        setTransform: vi.fn(),
      } as any;
    });

    HTMLCanvasElement.prototype.toBlob = vi.fn(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string
    ) {
      const mockBlob = new Blob(["mock-canvas-blob"], { type: type || "image/png" });
      setTimeout(() => callback(mockBlob), 0);
    });
  }
}
