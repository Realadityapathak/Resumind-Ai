interface JsonCandidate {
  start: number;
  end: number;
  type: "object" | "array";
  raw: string;
}

/**
 * Extracts inner content from Markdown code fences (e.g. ````json ... ```` or ```` ... ````).
 * Handles nested CommonMark fences (4+ backticks enclosing 3 backticks) and multiple blocks.
 */
function extractCodeFence(text: string): string {
  // 1. Look for code fence specifically tagged with "json" (supports 3+ backticks)
  const jsonFenceRegex = /(`{3,})json[^\n`]*\n?([\s\S]*?)(?:\1|$)/i;
  const jsonMatch = text.match(jsonFenceRegex);
  if (jsonMatch && jsonMatch[2] !== undefined && jsonMatch[2].trim()) {
    return jsonMatch[2].trim();
  }

  // 2. Look for any generic code fence containing { or [
  const genericFenceGlobal = /(`{3,})[^\n`]*\n?([\s\S]*?)(?:\1|$)/g;
  let match: RegExpExecArray | null;
  while ((match = genericFenceGlobal.exec(text)) !== null) {
    const candidate = match[2]?.trim();
    if (candidate && (candidate.includes("{") || candidate.includes("["))) {
      // Check if candidate itself contains an inner json fence
      const innerJson = candidate.match(jsonFenceRegex);
      if (innerJson && innerJson[2]?.trim()) {
        return innerJson[2].trim();
      }
      return candidate;
    }
  }

  // 3. Fallback: first generic code fence if present
  const firstGeneric = text.match(/(`{3,})[^\n`]*\n?([\s\S]*?)(?:\1|$)/);
  if (firstGeneric && firstGeneric[2]?.trim()) {
    return firstGeneric[2].trim();
  }

  return text;
}

/**
 * Escapes literal unescaped control characters (\n, \r, \t) inside double-quoted string literals
 * without touching formatting newlines outside strings.
 */
function escapeControlCharsInStrings(jsonStr: string): string {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === "\\") {
        result += char;
        isEscaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else if (char === "\n") {
        result += "\\n";
      } else if (char === "\r") {
        result += "\\r";
      } else if (char === "\t") {
        result += "\\t";
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }

  return result;
}

/**
 * Normalizes smart quotes, trims trailing commas before } or ], and escapes raw control characters.
 */
function sanitizeJsonString(str: string): string {
  const quotesNormalized = str
    .replace(/[\u201C\u201D\u2018\u2019]/g, '"')
    .replace(/,\s*([}\]])/g, "$1");
  return escapeControlCharsInStrings(quotesNormalized);
}

/**
 * Scans string for balanced JSON structure candidates ({...} or [...]),
 * tracking string literals so inner braces/brackets are not treated as delimiters.
 */
function findJsonCandidates(text: string): JsonCandidate[] {
  const candidates: JsonCandidate[] = [];
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const char = text[i];
    if (char === "{" || char === "[") {
      const openChar = char;
      const closeChar = char === "{" ? "}" : "]";
      const type = char === "{" ? "object" : "array";

      let depth = 0;
      let inStr = false;
      let isEsc = false;
      let endIdx = -1;

      for (let j = i; j < len; j++) {
        const c = text[j];

        if (inStr) {
          if (isEsc) {
            isEsc = false;
          } else if (c === "\\") {
            isEsc = true;
          } else if (c === '"') {
            inStr = false;
          }
        } else {
          if (c === '"') {
            inStr = true;
          } else if (c === openChar) {
            depth++;
          } else if (c === closeChar) {
            depth--;
            if (depth === 0) {
              endIdx = j;
              break;
            }
          }
        }
      }

      if (endIdx !== -1) {
        candidates.push({
          start: i,
          end: endIdx,
          type,
          raw: text.slice(i, endIdx + 1),
        });
      }
    }
  }

  return candidates;
}

/**
 * Tests whether a candidate substring can be parsed directly or after sanitization.
 */
function canParseCandidate(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    // Try after sanitization
  }
  try {
    const sanitized = sanitizeJsonString(str);
    JSON.parse(sanitized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Strips markdown code fences (```json ... ```), preambles, and postscripts,
 * trimming the string to the outermost JSON object or array bounds.
 */
export function cleanJson(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  let cleaned = text.trim();

  // Strip UTF-8 BOM if present
  if (cleaned.charCodeAt(0) === 0xfeff) {
    cleaned = cleaned.slice(1);
  }

  // 1. Extract markdown code fence content (```json ... ``` or ``` ... ```)
  cleaned = extractCodeFence(cleaned);

  // If already pure JSON object or array covering entire string
  if (
    (cleaned.startsWith("{") && cleaned.endsWith("}")) ||
    (cleaned.startsWith("[") && cleaned.endsWith("]"))
  ) {
    return cleaned;
  }

  // 2. Locate balanced JSON candidates
  const candidates = findJsonCandidates(cleaned);
  if (candidates.length > 0) {
    const validCandidates: JsonCandidate[] = [];
    for (const cand of candidates) {
      if (canParseCandidate(cand.raw)) {
        validCandidates.push(cand);
      }
    }

    if (validCandidates.length > 0) {
      // Rank valid candidates:
      // 1. Prefer Objects over primitive Arrays if both exist in conversational responses
      // 2. Length (prefer outermost / largest structure)
      validCandidates.sort((a, b) => {
        if (a.type !== b.type) {
          if (a.type === "object") return -1;
          return 1;
        }
        return b.raw.length - a.raw.length;
      });

      return validCandidates[0].raw.trim();
    }
  }

  // 3. Fallback: paired brace/bracket slicing (never cross-pairing mismatched delimiters)
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  const hasBrace = firstBrace !== -1 && lastBrace > firstBrace;
  const hasBracket = firstBracket !== -1 && lastBracket > firstBracket;

  if (hasBrace && hasBracket) {
    // Choose the outermost enclosing structure based on which open delimiter appears first
    if (firstBracket < firstBrace) {
      return cleaned.slice(firstBracket, lastBracket + 1).trim();
    }
    return cleaned.slice(firstBrace, lastBrace + 1).trim();
  }

  if (hasBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1).trim();
  }

  if (hasBracket) {
    return cleaned.slice(firstBracket, lastBracket + 1).trim();
  }

  return cleaned.trim();
}

/**
 * Safely parses a JSON string with automatic fence cleaning, quote normalization,
 * control character escaping, and trailing comma repair, falling back to a default value on error.
 */
export function safeJsonParse<T>(input: unknown, fallback: T): T {
  if (typeof input !== "string") {
    return fallback;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }

  // Attempt 1: Direct JSON.parse
  try {
    const parsed = JSON.parse(trimmed);
    // Handle double-encoded JSON strings
    if (typeof parsed === "string") {
      try {
        const doubleParsed = JSON.parse(parsed);
        if (doubleParsed && typeof doubleParsed === "object") {
          return doubleParsed as T;
        }
      } catch {
        // Not double encoded
      }
    }
    return parsed as T;
  } catch {
    // Continue to sanitized attempt
  }

  // Attempt 2: cleanJson(trimmed)
  const cleaned = cleanJson(trimmed);
  if (!cleaned) {
    return fallback;
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Continue to normalized attempt
  }

  // Attempt 3: Normalize smart quotes, repair trailing commas, and escape unescaped control characters
  try {
    const sanitized = sanitizeJsonString(cleaned);
    return JSON.parse(sanitized) as T;
  } catch (err) {
    console.warn("safeJsonParse failed to parse text:", err);
    return fallback;
  }
}
