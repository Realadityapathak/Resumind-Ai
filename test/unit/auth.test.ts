import { describe, it, expect } from "vitest";
import { getSafeRedirect } from "~/utils/redirect";

describe("Open Redirect & Redirect Sanitization (getSafeRedirect)", () => {
  describe("Category 1: Valid Relative Application Paths", () => {
    it("allows root path '/'", () => {
      expect(getSafeRedirect("/")).toBe("/");
    });

    it("allows standard dashboard and workspace routes", () => {
      expect(getSafeRedirect("/dashboard")).toBe("/dashboard");
      expect(getSafeRedirect("/workspace")).toBe("/workspace");
      expect(getSafeRedirect("/profile")).toBe("/profile");
      expect(getSafeRedirect("/upload")).toBe("/upload");
    });

    it("allows deep nested routes with resume UUIDs", () => {
      expect(getSafeRedirect("/resume/res_abc123")).toBe("/resume/res_abc123");
    });

    it("preserves query parameters on valid paths", () => {
      expect(getSafeRedirect("/resume/123?tab=skills")).toBe("/resume/123?tab=skills");
      expect(getSafeRedirect("/upload?step=1&type=pdf")).toBe("/upload?step=1&type=pdf");
    });

    it("preserves both query parameters and hash anchors", () => {
      expect(getSafeRedirect("/resume/123?tab=skills#section")).toBe("/resume/123?tab=skills#section");
    });

    it("allows valid percent-encoded spaces in paths", () => {
      expect(getSafeRedirect("/path%20with%20spaces")).toBe("/path%20with%20spaces");
    });

    it("allows safe internal query parameters containing slashes", () => {
      expect(getSafeRedirect("/resume/123?ref=/dashboard")).toBe("/resume/123?ref=/dashboard");
    });

    it("respects custom fallback when input is invalid or missing", () => {
      expect(getSafeRedirect(null, "/dashboard")).toBe("/dashboard");
      expect(getSafeRedirect("https://evil.com", "/workspace")).toBe("/workspace");
    });
  });

  describe("Category 2: Backslash Evasion Vectors (WHATWG Normalization)", () => {
    it("blocks slash-backslash attack: /\\evil.com", () => {
      expect(getSafeRedirect("/\\evil.com")).toBe("/");
    });

    it("blocks slash-double-backslash attack: /\\\\evil.com", () => {
      expect(getSafeRedirect("/\\\\evil.com")).toBe("/");
    });

    it("blocks alternating slash-backslash: /\\/evil.com", () => {
      expect(getSafeRedirect("/\\/evil.com")).toBe("/");
    });

    it("blocks slash-backslash with nested path: /\\evil.com/dashboard", () => {
      expect(getSafeRedirect("/\\evil.com/dashboard")).toBe("/");
    });

    it("blocks bare backslash: \\evil.com", () => {
      expect(getSafeRedirect("\\evil.com")).toBe("/");
    });

    it("blocks Windows UNC double backslash: \\\\evil.com", () => {
      expect(getSafeRedirect("\\\\evil.com")).toBe("/");
    });

    it("blocks backslash embedded within path: /foo\\bar", () => {
      expect(getSafeRedirect("/foo\\bar")).toBe("/");
      expect(getSafeRedirect("/dashboard\\evil.com")).toBe("/");
    });

    it("blocks path traversal combined with backslash: /foo/..\\evil.com", () => {
      expect(getSafeRedirect("/foo/..\\evil.com")).toBe("/");
      expect(getSafeRedirect("/..\\\\evil.com")).toBe("/");
    });
  });

  describe("Category 3: URL-Encoded Backslash & Slash Evasion", () => {
    it("blocks lowercase percent-encoded backslash: /%5cevil.com", () => {
      expect(getSafeRedirect("/%5cevil.com")).toBe("/");
    });

    it("blocks uppercase percent-encoded backslash: /%5Cevil.com", () => {
      expect(getSafeRedirect("/%5Cevil.com")).toBe("/");
    });

    it("blocks double percent-encoded backslash: /%255cevil.com", () => {
      expect(getSafeRedirect("/%255cevil.com")).toBe("/");
    });

    it("blocks triple percent-encoded backslash: /%25255cevil.com", () => {
      expect(getSafeRedirect("/%25255cevil.com")).toBe("/");
    });

    it("blocks encoded slash forming protocol-relative URL: /%2fevil.com", () => {
      expect(getSafeRedirect("/%2fevil.com")).toBe("/");
    });

    it("blocks double encoded slash: /%252fevil.com", () => {
      expect(getSafeRedirect("/%252fevil.com")).toBe("/");
    });

    it("blocks malformed URI percent sequences: /%99bad%percent", () => {
      expect(getSafeRedirect("/%99bad%percent")).toBe("/");
      expect(getSafeRedirect("/%E0%A4%A")).toBe("/");
    });
  });

  describe("Category 4: Protocol-Relative and Multi-Slash Vectors", () => {
    it("blocks double slash: //evil.com", () => {
      expect(getSafeRedirect("//evil.com")).toBe("/");
    });

    it("blocks triple slash: ///evil.com", () => {
      expect(getSafeRedirect("///evil.com")).toBe("/");
    });

    it("blocks quadruple slash: ////evil.com", () => {
      expect(getSafeRedirect("////evil.com")).toBe("/");
    });

    it("blocks protocol-relative with path: //evil.com/path", () => {
      expect(getSafeRedirect("//evil.com/path")).toBe("/");
    });

    it("blocks protocol-relative with local port: //localhost:3000", () => {
      expect(getSafeRedirect("//localhost:3000")).toBe("/");
    });

    it("blocks bare multiple slashes: '//' and '///'", () => {
      expect(getSafeRedirect("//")).toBe("/");
      expect(getSafeRedirect("///")).toBe("/");
    });
  });

  describe("Category 5: Path Traversal Normalization Bypass Vectors", () => {
    it("blocks dot-slash normalization to double slash: /.//evil.com", () => {
      expect(getSafeRedirect("/.//evil.com")).toBe("/");
    });

    it("blocks dot-dot-slash normalization to double slash: /..//evil.com", () => {
      expect(getSafeRedirect("/..//evil.com")).toBe("/");
    });

    it("blocks traversal to double slash: /foo/..//evil.com", () => {
      expect(getSafeRedirect("/foo/..//evil.com")).toBe("/");
      expect(getSafeRedirect("/foo/../..//evil.com")).toBe("/");
    });

    it("blocks encoded dot traversal bypass: /.%2f/evil.com", () => {
      expect(getSafeRedirect("/.%2f/evil.com")).toBe("/");
    });

    it("blocks encoded dot-dot traversal bypass: /..%2f/evil.com", () => {
      expect(getSafeRedirect("/..%2f/evil.com")).toBe("/");
    });
  });

  describe("Category 6: External Scheme Vectors", () => {
    it("blocks https external URL: https://evil.com", () => {
      expect(getSafeRedirect("https://evil.com")).toBe("/");
    });

    it("blocks http external URL: http://evil.com", () => {
      expect(getSafeRedirect("http://evil.com")).toBe("/");
    });

    it("blocks javascript scheme: javascript:alert(1)", () => {
      expect(getSafeRedirect("javascript:alert(1)")).toBe("/");
    });

    it("blocks data URI scheme: data:text/html,evil", () => {
      expect(getSafeRedirect("data:text/html,evil")).toBe("/");
    });

    it("blocks vbscript scheme: vbscript:evil", () => {
      expect(getSafeRedirect("vbscript:evil")).toBe("/");
    });

    it("blocks file scheme: file:///etc/passwd", () => {
      expect(getSafeRedirect("file:///etc/passwd")).toBe("/");
    });

    it("blocks blob scheme: blob:http://localhost/uuid", () => {
      expect(getSafeRedirect("blob:http://localhost/uuid")).toBe("/");
    });
  });

  describe("Category 7: Userinfo and Credential Injection", () => {
    it("blocks userinfo credentials in protocol-relative URL: //user:pass@evil.com", () => {
      expect(getSafeRedirect("//user:pass@evil.com")).toBe("/");
    });

    it("blocks origin confusion with local domain: //localhost:3000@evil.com", () => {
      expect(getSafeRedirect("//localhost:3000@evil.com")).toBe("/");
    });

    it("blocks userinfo with bare host: //@evil.com", () => {
      expect(getSafeRedirect("//@evil.com")).toBe("/");
    });
  });

  describe("Category 8: Control Characters, Tabs, and Whitespace Evasion", () => {
    it("blocks tab stripping evasion: /\\t/evil.com", () => {
      expect(getSafeRedirect("/\t/evil.com")).toBe("/");
    });

    it("blocks carriage return stripping evasion: /\\r/evil.com", () => {
      expect(getSafeRedirect("/\r/evil.com")).toBe("/");
    });

    it("blocks newline stripping evasion: /\\n/evil.com", () => {
      expect(getSafeRedirect("/\n/evil.com")).toBe("/");
    });

    it("blocks mixed tab-backslash evasion: /\\t\\evil.com", () => {
      expect(getSafeRedirect("/\t\\evil.com")).toBe("/");
    });

    it("blocks null byte injection: /\\0evil.com and /%00evil.com", () => {
      expect(getSafeRedirect("/\0evil.com")).toBe("/");
      expect(getSafeRedirect("/%00evil.com")).toBe("/");
    });

    it("trims leading whitespace before an internal path", () => {
      expect(getSafeRedirect(" /dashboard")).toBe("/dashboard"); // cleanly trimmed to safe path
    });

    it("blocks ASCII control characters: 0x1F and 0x7F", () => {
      expect(getSafeRedirect("/\x1fevil.com")).toBe("/");
      expect(getSafeRedirect("/\x7fevil.com")).toBe("/");
    });
  });

  describe("Category 9: Null, Undefined, and Empty Inputs", () => {
    it("handles null and undefined safely", () => {
      expect(getSafeRedirect(null)).toBe("/");
      expect(getSafeRedirect(undefined)).toBe("/");
    });

    it("handles empty string and whitespace-only strings", () => {
      expect(getSafeRedirect("")).toBe("/");
      expect(getSafeRedirect("   ")).toBe("/");
    });

    it("handles non-string types safely", () => {
      expect(getSafeRedirect(123 as unknown as string)).toBe("/");
      expect(getSafeRedirect({} as unknown as string)).toBe("/");
    });
  });

  describe("Category 10: Browser History Security Invariant", () => {
    it("guarantees replaceState never throws SecurityError across all adversarial inputs", () => {
      const maliciousVectors = [
        "/\\evil.com",
        "/\\\\evil.com",
        "//evil.com",
        "///evil.com",
        "/%5cevil.com",
        "/.//evil.com",
        "/..//evil.com",
        "/\t/evil.com",
        "/\r/evil.com",
        "javascript:alert(1)",
        "https://evil.com",
      ];

      for (const vector of maliciousVectors) {
        const sanitized = getSafeRedirect(vector);
        expect(sanitized).toBe("/");
        expect(() => {
          window.history.replaceState({}, "", sanitized);
        }).not.toThrow();
        expect(window.location.pathname).toBe("/");
      }
    });
  });
});
