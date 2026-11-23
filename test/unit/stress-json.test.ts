import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { safeJsonParse } from "~/utils/json";

describe("Adversarial Stress Testing: cleanJson & safeJsonParse", () => {
  const originalWarn = console.warn;
  beforeEach(() => {
    console.warn = vi.fn();
  });
  afterEach(() => {
    console.warn = originalWarn;
  });

  // ---------------------------------------------------------------------------
  // Category 1: Nested and Multi-Block Markdown Fences
  // ---------------------------------------------------------------------------
  describe("Category 1: Nested & Multi-Block Markdown Fences", () => {
    it("handles quadruple backtick enclosing triple backtick fence (CommonMark nested block)", () => {
      const input = "````markdown\n```json\n{\"a\": 1}\n```\n````";
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ a: 1 });
    });

    it("handles nested fences with text surrounding the inner fence", () => {
      const input = "````markdown\nHere is the payload:\n```json\n{\"nested\": true}\n```\nClosing remarks\n````";
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ nested: true });
    });

    it("handles multiple separate markdown code blocks (e.g. python snippet followed by json block)", () => {
      const input = "First, here is a snippet:\n```python\nprint('hello')\n```\nNow here is the result:\n```json\n{\"status\": \"ok\", \"count\": 5}\n```";
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ status: "ok", count: 5 });
    });

    it("handles unclosed markdown fences (``` without closing fence)", () => {
      const input = "```json\n{\"open\": true, \"closed\": false}\n";
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ open: true, closed: false });
    });

    it("handles multiple backticks (> 4 backticks)", () => {
      const input = "`````json\n{\"depth\": 5}\n`````";
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ depth: 5 });
    });
  });

  // ---------------------------------------------------------------------------
  // Category 2: Preamble and Postscript with Braces / Brackets
  // ---------------------------------------------------------------------------
  describe("Category 2: Preamble / Postscript with Braces & Brackets", () => {
    it("extracts valid JSON when preamble contains braces: 'Here is the result {foo: bar}: {\"valid\": true}'", () => {
      const input = 'Here is the result {foo: bar}: {"valid": true}';
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ valid: true });
    });

    it("extracts valid JSON when preamble contains conversational braces: 'Note {a, b} are options: {\"key\": \"value\"}'", () => {
      const input = 'Note {a, b} are options: {"key": "value"}';
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ key: "value" });
    });

    it("extracts valid JSON when postscript contains trailing braces: '{\"score\": 100} (Check out {item1, item2})'", () => {
      const input = '{"score": 100} (Check out {item1, item2})';
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ score: 100 });
    });

    it("handles preamble brackets without cross-bracket slicing: 'Array [1, 2]: {\"score\": 90}'", () => {
      const input = 'Array [1, 2]: {"score": 90}';
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ score: 90 });
    });
  });

  // ---------------------------------------------------------------------------
  // Category 3: Smart Quotes, Typographic Symbols, & Quotes Inside Values
  // ---------------------------------------------------------------------------
  describe("Category 3: Smart Quotes & Typographic Normalization", () => {
    it("normalizes left and right double curly quotes (\u201C and \u201D)", () => {
      const input = '{\u201Ctitle\u201D: \u201CSoftware Engineer\u201D, \u201Cscore\u201D: 95}';
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ title: "Software Engineer", score: 95 });
    });

    it("normalizes smart single quotes (\u2018 and \u2019) to valid double-quoted JSON", () => {
      const smartSingle = '{\u2018key\u2019: \u2018value\u2019}';
      const parsed = safeJsonParse(smartSingle, null);
      expect(parsed).toEqual({ key: "value" });
    });

    it("handles backticks inside JSON string values", () => {
      const input = '{"code": "const x = `hello`;"}';
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ code: "const x = `hello`;" });
    });
  });

  // ---------------------------------------------------------------------------
  // Category 4: Unescaped Newlines & Control Characters Inside Strings
  // ---------------------------------------------------------------------------
  describe("Category 4: Newlines, Tabs & Control Characters", () => {
    it("handles unescaped literal newlines inside JSON string values without failing", () => {
      const rawNewline = '{\n  "summary": "This is line 1\nThis is line 2"\n}';
      const parsed = safeJsonParse(rawNewline, null);
      expect(parsed).toEqual({ summary: "This is line 1\nThis is line 2" });
    });

    it("handles valid escaped newlines (\\n)", () => {
      const escapedNewline = '{"summary": "This is line 1\\nThis is line 2"}';
      const parsed = safeJsonParse(escapedNewline, null);
      expect(parsed).toEqual({ summary: "This is line 1\nThis is line 2" });
    });

    it("handles UTF-8 Byte Order Mark (BOM) at string start", () => {
      const bomInput = "\uFEFF" + '{"bom": true}';
      const parsed = safeJsonParse(bomInput, null);
      expect(parsed).toEqual({ bom: true });
    });

    it("handles zero-width spaces (\u200B) cleanly", () => {
      const zwspInput = "\u200B" + '{"zwsp": true}' + "\u200B";
      const parsed = safeJsonParse(zwspInput, null);
      expect(parsed).toEqual({ zwsp: true });
    });
  });

  // ---------------------------------------------------------------------------
  // Category 5: Trailing Commas & Lenient Formatting
  // ---------------------------------------------------------------------------
  describe("Category 5: Trailing Commas", () => {
    it("repairs trailing comma in simple object", () => {
      const input = '{"a": 1, "b": 2,}';
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ a: 1, b: 2 });
    });

    it("repairs trailing comma in simple array", () => {
      const input = '["first", "second",]';
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual(["first", "second"]);
    });

    it("repairs trailing commas in nested structures with whitespace", () => {
      const input = `{\n  "arr": [\n    {"id": 1,},\n    {"id": 2,},\n  ],\n}`;
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ arr: [{ id: 1 }, { id: 2 }] });
    });
  });

  // ---------------------------------------------------------------------------
  // Category 6: Unicode Emojis & International Text
  // ---------------------------------------------------------------------------
  describe("Category 6: Unicode Emojis & International Text", () => {
    it("preserves complex surrogate-pair emojis and combinations", () => {
      const input = '{"reaction": "🚀👨‍💻🔥✨", "score": 99}';
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ reaction: "🚀👨‍💻🔥✨", score: 99 });
    });

    it("preserves non-Latin scripts (Devanagari, Arabic, CJK)", () => {
      const input = '{"hindi": "नमस्ते", "arabic": "مرحبا", "cjk": "你好世界"}';
      const parsed = safeJsonParse(input, null);
      expect(parsed).toEqual({ hindi: "नमस्ते", arabic: "مرحبا", cjk: "你好世界" });
    });
  });

  // ---------------------------------------------------------------------------
  // Category 7: Truncated JSON & Incomplete Streams
  // ---------------------------------------------------------------------------
  describe("Category 7: Truncated & Incomplete JSON (Fallback Verification)", () => {
    it("returns fallback on truncated key: '{\"score\": 85, \"na'", () => {
      const fallback = { fallback: true };
      const parsed = safeJsonParse('{"score": 85, "na', fallback);
      expect(parsed).toBe(fallback);
    });

    it("returns fallback on truncated value: '{\"score\": 85, \"feedback\": \"good'", () => {
      const fallback = { status: "incomplete" };
      const parsed = safeJsonParse('{"score": 85, "feedback": "good', fallback);
      expect(parsed).toBe(fallback);
    });

    it("returns fallback on unclosed object brace: '{\"score\": 85'", () => {
      const fallback = { score: 0 };
      const parsed = safeJsonParse('{"score": 85', fallback);
      expect(parsed).toBe(fallback);
    });

    it("returns fallback on unclosed array: '[1, 2, 3'", () => {
      const fallback: number[] = [];
      const parsed = safeJsonParse("[1, 2, 3", fallback);
      expect(parsed).toBe(fallback);
    });
  });

  // ---------------------------------------------------------------------------
  // Category 8: Empty, Falsy, & Non-String Inputs
  // ---------------------------------------------------------------------------
  describe("Category 8: Falsy & Non-String Boundary Cases", () => {
    it("returns fallback on empty string", () => {
      const fallback = { default: true };
      expect(safeJsonParse("", fallback)).toBe(fallback);
    });

    it("returns fallback on whitespace-only string", () => {
      const fallback = { default: true };
      expect(safeJsonParse("   \n\t  ", fallback)).toBe(fallback);
    });

    it("returns fallback on null and undefined input", () => {
      const fallback = { default: true };
      expect(safeJsonParse(null, fallback)).toBe(fallback);
      expect(safeJsonParse(undefined, fallback)).toBe(fallback);
    });

    it("returns fallback on non-string types passed at runtime", () => {
      const fallback = { default: true };
      expect(safeJsonParse(12345, fallback)).toBe(fallback);
      expect(safeJsonParse(true, fallback)).toBe(fallback);
      expect(safeJsonParse({}, fallback)).toBe(fallback);
    });
  });

  // ---------------------------------------------------------------------------
  // Category 9: Non-Object JSON (Primitives & Arrays)
  // ---------------------------------------------------------------------------
  describe("Category 9: Non-Object JSON (Numbers, Booleans, Arrays)", () => {
    it("parses JSON array correctly", () => {
      const input = '[1, 2, "three", true]';
      const parsed = safeJsonParse(input, []);
      expect(parsed).toEqual([1, 2, "three", true]);
    });

    it("parses pure JSON number '42'", () => {
      const parsed = safeJsonParse("42", 0);
      expect(parsed).toBe(42);
    });

    it("parses pure JSON boolean 'true'", () => {
      expect(safeJsonParse("true", false)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Category 10: Prototype Pollution Stress Tests
  // ---------------------------------------------------------------------------
  describe("Category 10: Prototype Pollution Resistance", () => {
    it("does not pollute Object.prototype when parsing __proto__ key", () => {
      expect((Object.prototype as { polluted?: unknown }).polluted).toBeUndefined();
      const maliciousPayload = '{"__proto__": {"polluted": "yes", "isAdmin": true}}';
      safeJsonParse<Record<string, unknown>>(maliciousPayload, {});
      expect((Object.prototype as { polluted?: unknown }).polluted).toBeUndefined();
      expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
    });

    it("does not pollute Object.prototype via constructor.prototype payload", () => {
      expect((Object.prototype as { hacked?: unknown }).hacked).toBeUndefined();
      const maliciousPayload = '{"constructor": {"prototype": {"hacked": true}}}';
      safeJsonParse<Record<string, unknown>>(maliciousPayload, {});
      expect((Object.prototype as { hacked?: unknown }).hacked).toBeUndefined();
      expect(({} as { hacked?: unknown }).hacked).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Category 11: Absolute Exception Safety Invariant
  // ---------------------------------------------------------------------------
  describe("Category 11: Absolute Exception Safety Invariant", () => {
    const pathologicalInputs = [
      "{", "}", "[", "]", "{{{{", "}}}}", "[[[[", "]]]]", "{]", "[}",
      "undefined", "NaN", "Infinity", "-Infinity", "function() {}",
      "<script>alert(1)</script>", "<!-- HTML Comment -->",
      "\u0000\u0001\u0002\u0003", "\\u0000", "{\"key\": undefined}",
      "{\"a\": 1 2 3}", "{\"a\": 'b'}", ",,,,,", ":::::",
      "\"unclosed string", "'unclosed single", "`unclosed backtick",
      "```json\n\n```", "```\n\n```", "```json\nundefined\n```",
      "```json\n{\"unterminated\": \"val\n```",
    ];

    pathologicalInputs.forEach((input, idx) => {
      it(`does not throw an unhandled exception for input #${idx}: ${JSON.stringify(input.slice(0, 25))}`, () => {
        const fallback = { fallbackId: idx };
        let result: unknown;
        expect(() => {
          result = safeJsonParse(input, fallback);
        }).not.toThrow();
        expect(result).toBeDefined();
      });
    });
  });
});
