import { describe, it, expect, beforeEach, vi } from "vitest";
import { puterMock, resetPuterMock } from "../mocks/puterMock";
import { getSafeRedirect } from "~/utils/redirect";

describe("Adversarial Review: Auth Redirect Validation Logic", () => {
  // Mirror the route's query parsing so URLSearchParams decoding remains under test.
  function evaluateRedirect(searchString: string): string {
    const searchParams = new URLSearchParams(searchString);
    const rawNext = searchParams.get("next");
    return getSafeRedirect(rawNext);
  }

  it("blocks protocol-relative URL: //evil.com", () => {
    const result = evaluateRedirect("?next=//evil.com");
    expect(result).toBe("/");
  });

  it("blocks absolute URL with https scheme: https://evil.com", () => {
    const result = evaluateRedirect("?next=https://evil.com");
    expect(result).toBe("/");
  });

  it("blocks javascript: URI scheme", () => {
    const result = evaluateRedirect("?next=javascript:alert(1)");
    expect(result).toBe("/");
  });

  it("handles URL-encoded internal paths with query parameters: ?next=%2Ffoo%2Fbar%3Fq%3D1%26v%3D2", () => {
    const result = evaluateRedirect("?next=%2Ffoo%2Fbar%3Fq%3D1%26v%3D2");
    expect(result).toBe("/foo/bar?q=1&v=2");
  });

  it("demonstrates parameter truncation when unencoded internal query params are passed: ?next=/foo/bar?q=1&v=2", () => {
    // When unencoded, URLSearchParams treats &v=2 as a separate query parameter on the auth route!
    const result = evaluateRedirect("?next=/foo/bar?q=1&v=2");
    expect(result).toBe("/foo/bar?q=1"); // Truncated!
  });

  it("TESTING VULNERABILITY: Backslash open redirect vector /\\evil.com", () => {
    const result = evaluateRedirect("?next=/\\evil.com");
    // Under WHATWG URL standard, new URL('/\\evil.com', 'http://example.com').href -> 'http://evil.com/'
    // In auth.tsx, safeNext securely blocks /\\evil.com!
    console.log("Evaluated /\\evil.com safeNext:", result);
    const isVulnerable = result === "/\\evil.com" || result.startsWith("/\\");
    console.log("Is /\\evil.com allowed by auth.tsx?:", isVulnerable);
    expect(isVulnerable).toBe(false);
    expect(result).toBe("/");
  });

  it("TESTING VULNERABILITY: Double backslash open redirect vector /\\\\evil.com", () => {
    const result = evaluateRedirect("?next=/\\\\evil.com");
    console.log("Evaluated /\\\\evil.com safeNext:", result);
    const isVulnerable = result.startsWith("/\\");
    console.log("Is /\\\\evil.com allowed by auth.tsx?:", isVulnerable);
    expect(isVulnerable).toBe(false);
    expect(result).toBe("/");
  });

  it("TESTING VULNERABILITY: Encoded backslash open redirect vector /%5cevil.com", () => {
    const result = evaluateRedirect("?next=/%5cevil.com");
    console.log("Evaluated /%5cevil.com safeNext:", result);
    // URLSearchParams decodes %5c to \
    const isVulnerable = result.startsWith("/\\");
    console.log("Is /%5cevil.com allowed by auth.tsx?:", isVulnerable);
    expect(isVulnerable).toBe(false);
    expect(result).toBe("/");
  });

  it("TESTING VULNERABILITY: Forward-slash backslash combo /\\/evil.com", () => {
    const result = evaluateRedirect("?next=/\\/evil.com");
    console.log("Evaluated /\\/evil.com safeNext:", result);
    const isVulnerable = result.startsWith("/\\");
    console.log("Is /\\/evil.com allowed by auth.tsx?:", isVulnerable);
    expect(isVulnerable).toBe(false);
    expect(result).toBe("/");
  });
});

describe("Adversarial Review: Puter Mock KV Concurrency and Edge Cases", () => {
  beforeEach(() => {
    resetPuterMock();
  });

  it("wildcard matching handles standard patterns: resume:*", async () => {
    await puterMock.kv.set("resume:1", JSON.stringify({ id: 1 }));
    await puterMock.kv.set("resume:2", JSON.stringify({ id: 2 }));
    await puterMock.kv.set("user:profile", JSON.stringify({ name: "Alice" }));

    const keys = (await puterMock.kv.list("resume:*")) as string[];
    expect(keys).toHaveLength(2);
    expect(keys).toContain("resume:1");
    expect(keys).toContain("resume:2");
    expect(keys).not.toContain("user:profile");
  });

  it("wildcard matching handles full wildcard: *", async () => {
    await puterMock.kv.set("k1", "v1");
    await puterMock.kv.set("k2", "v2");
    const keys = (await puterMock.kv.list("*")) as string[];
    expect(keys).toHaveLength(2);
  });

  it("handles null/missing key gets gracefully", async () => {
    const nonExistent = await puterMock.kv.get("does_not_exist");
    expect(nonExistent).toBeNull();

    const nullKey = await puterMock.kv.get(null as unknown as string);
    expect(nullKey).toBeNull();
  });

  it("properly overwrites existing keys", async () => {
    await puterMock.kv.set("resume:key1", "original_value");
    expect(await puterMock.kv.get("resume:key1")).toBe("original_value");

    await puterMock.kv.set("resume:key1", "updated_value");
    expect(await puterMock.kv.get("resume:key1")).toBe("updated_value");
  });

  it("atomic flush clears all keys synchronously", async () => {
    await puterMock.kv.set("resume:1", "val1");
    await puterMock.kv.set("resume:2", "val2");
    await puterMock.kv.set("config:theme", "dark");

    const flushResult = await puterMock.kv.flush();
    expect(flushResult).toBe(true);

    const remainingKeys = await puterMock.kv.list("*");
    expect(remainingKeys).toHaveLength(0);
  });

  it("concurrent writes and reads resolve consistently", async () => {
    const writes = Array.from({ length: 50 }, (_, i) =>
      puterMock.kv.set(`concurrent:${i}`, `value_${i}`)
    );
    await Promise.all(writes);

    const reads = Array.from({ length: 50 }, (_, i) =>
      puterMock.kv.get(`concurrent:${i}`)
    );
    const results = await Promise.all(reads);

    results.forEach((val, i) => {
      expect(val).toBe(`value_${i}`);
    });
  });

  it("handles regex special characters in pattern without throwing SyntaxError", async () => {
    await puterMock.kv.set("prefix(test):1", "val");
    const keys = await puterMock.kv.list("prefix(*");
    expect(keys).toEqual(["prefix(test):1"]);
  });

  it("allows calling kv.list() without arguments to list all keys", async () => {
    await puterMock.kv.set("k1", "v1");
    const keys = await (
      puterMock.kv.list as (pattern?: string) => Promise<string[]>
    )();
    expect(keys).toContain("k1");
  });
});

describe("Adversarial Review: FileUploader Dropzone State Handling", () => {
  it("rejects non-PDF files without calling onFileSelect with a file", async () => {
    const { render, fireEvent, screen, waitFor } = await import("@testing-library/react");
    const FileUploader = (await import("~/features/upload/FileUploader")).default;
    const onFileSelectMock = vi.fn();
    const { container } = render(<FileUploader onFileSelect={onFileSelectMock} />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const badFile = new File(["dummy content"], "malicious.exe", { type: "application/x-msdownload" });
    fireEvent.change(input, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(screen.queryByText("malicious.exe")).not.toBeInTheDocument();
      expect(onFileSelectMock).not.toHaveBeenCalledWith(badFile);
    });
  });

  it("rejects files exceeding 20MB max file size", async () => {
    const { render, fireEvent, screen, waitFor } = await import("@testing-library/react");
    const FileUploader = (await import("~/features/upload/FileUploader")).default;
    const onFileSelectMock = vi.fn();
    const { container } = render(<FileUploader onFileSelect={onFileSelectMock} />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    // Create a mock 25MB file
    const largeFile = new File(["a".repeat(100)], "huge_resume.pdf", { type: "application/pdf" });
    Object.defineProperty(largeFile, "size", { value: 25 * 1024 * 1024 });

    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      // Dropzone should reject and not populate selectedFile
      expect(screen.queryByText("huge_resume.pdf")).not.toBeInTheDocument();
      expect(onFileSelectMock).not.toHaveBeenCalledWith(largeFile);
    });
  });

  it("handles remove button click: clears selection and resets file input value", async () => {
    const { render, fireEvent, screen, waitFor } = await import("@testing-library/react");
    const FileUploader = (await import("~/features/upload/FileUploader")).default;
    const onFileSelectMock = vi.fn();
    const { container } = render(<FileUploader onFileSelect={onFileSelectMock} />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const validFile = new File(["%PDF-1.4 mock content"], "sample.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText("sample.pdf")).toBeInTheDocument();
      expect(onFileSelectMock).toHaveBeenCalledWith(validFile);
    });

    const removeBtn = screen.getByTitle("Remove file");
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByText("sample.pdf")).not.toBeInTheDocument();
      expect(input.value).toBe("");
      expect(onFileSelectMock).toHaveBeenLastCalledWith(null);
    });
  });
});
