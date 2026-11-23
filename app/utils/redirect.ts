/**
 * Validates and sanitizes redirect target URLs to ensure only safe, internal relative
 * paths are accepted. Strictly blocks open redirects, protocol-relative URLs,
 * backslash evasions (WHATWG normalization), multi-encoded payloads, path traversal
 * normalization artifacts, control character injection, and browser replaceState crashes.
 *
 * @param rawNext - The untrusted redirect target from query parameters or user input
 * @param fallback - The safe fallback path if validation fails (defaults to '/')
 * @returns A safe relative path starting with a single '/'
 */
export function getSafeRedirect(rawNext: string | null | undefined, fallback: string = "/"): string {
  if (!rawNext || typeof rawNext !== "string") {
    return fallback;
  }

  const trimmed = rawNext.trim();
  if (!trimmed) {
    return fallback;
  }

  // 1. Block control characters, tabs, and newlines (WHATWG parser removes tabs/newlines)
  if (/[\t\r\n\x00-\x1f\x7f]/.test(trimmed)) {
    return fallback;
  }

  // 2. Must start with exactly one forward slash, not followed by / or \
  if (!trimmed.startsWith("/") || /^\/[\\/]/.test(trimmed)) {
    return fallback;
  }

  // 3. Fast-path: strictly disallow raw or percent-encoded backslashes
  if (trimmed.includes("\\") || /%5c/i.test(trimmed)) {
    return fallback;
  }

  // 4. Repeated decoding check (up to 3 passes) to unmask nested percent-encoding (e.g. %255c -> %5c -> \)
  let decoded = trimmed;
  for (let i = 0; i < 3; i++) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) break;
      decoded = nextDecoded;
    } catch {
      // Malformed URI percent encoding (e.g. %99 or truncated %)
      return fallback;
    }
  }

  if (
    decoded.includes("\\") ||
    /[\t\r\n\x00-\x1f\x7f]/.test(decoded) ||
    !decoded.startsWith("/") ||
    /^\/[\\/]/.test(decoded)
  ) {
    return fallback;
  }

  const base = "http://localhost";

  // 5. Verify decoded representation does not normalize to protocol-relative or cross-origin
  try {
    const parsedDecoded = new URL(decoded, base);
    if (
      parsedDecoded.origin !== base ||
      parsedDecoded.protocol !== "http:" ||
      parsedDecoded.pathname.startsWith("//") ||
      parsedDecoded.pathname.includes("\\")
    ) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  // 6. Parse trimmed input with WHATWG URL parser against local dummy base
  try {
    const parsed = new URL(trimmed, base);

    // Ensure strictly same origin, HTTP protocol, and no userinfo/credentials
    if (
      parsed.origin !== base ||
      parsed.protocol !== "http:" ||
      parsed.username ||
      parsed.password
    ) {
      return fallback;
    }

    // Verify resolved pathname and combined target (catches traversal like `/.//evil.com` -> `//evil.com`)
    const target = parsed.pathname + parsed.search + parsed.hash;
    if (!target.startsWith("/") || /^\/[\\/]/.test(target) || target.includes("\\")) {
      return fallback;
    }

    return target;
  } catch {
    return fallback;
  }
}
