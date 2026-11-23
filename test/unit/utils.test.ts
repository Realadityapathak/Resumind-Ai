import { describe, it, expect } from "vitest";
import { cn } from "~/utils/classNames";
import { formatSize } from "~/utils/formatSize";
import { cleanJson, safeJsonParse } from "~/utils/json";
import { generateUUID } from "~/utils/uuid";

describe("Utility Functions (app/utils)", () => {
  describe("cleanJson", () => {
    it("returns raw valid JSON string unchanged", () => {
      const raw = '{"overallScore": 85, "title": "Software Engineer"}';
      expect(cleanJson(raw)).toBe(raw);
    });

    it("strips standard markdown code fences (```json ... ```)", () => {
      const fenced = '```json\n{"overallScore": 85}\n```';
      expect(cleanJson(fenced)).toBe('{"overallScore": 85}');
    });

    it("strips generic markdown code fences without language tag (``` ... ```)", () => {
      const fenced = '```\n{"overallScore": 90}\n```';
      expect(cleanJson(fenced)).toBe('{"overallScore": 90}');
    });

    it("extracts embedded JSON from conversational AI responses", () => {
      const conversational =
        'Here is your requested evaluation:\n```json\n{"overallScore": 78}\n```\nHope this helps!';
      expect(cleanJson(conversational)).toBe('{"overallScore": 78}');
    });

    it("extracts JSON arrays with markdown fences", () => {
      const arrayJson = '```json\n[{"id": 1}, {"id": 2}]\n```';
      expect(cleanJson(arrayJson)).toBe('[{"id": 1}, {"id": 2}]');
    });

    it("handles leading and trailing whitespace and newlines cleanly", () => {
      const padded = '   \n\n  {"score": 95}  \n \n';
      expect(cleanJson(padded)).toBe('{"score": 95}');
    });

    it("returns empty string when given non-string or falsy input", () => {
      expect(cleanJson("")).toBe("");
      expect(cleanJson(null as unknown as string)).toBe("");
      expect(cleanJson(undefined as unknown as string)).toBe("");
    });
  });

  describe("safeJsonParse", () => {
    it("parses valid JSON string into typed object", () => {
      const jsonStr = '{"score": 88, "name": "Test"}';
      const parsed = safeJsonParse(jsonStr, { score: 0, name: "" });
      expect(parsed).toEqual({ score: 88, name: "Test" });
    });

    it("cleans markdown fences before parsing automatically", () => {
      const fenced = '```json\n{"score": 92}\n```';
      const parsed = safeJsonParse(fenced, { score: 0 });
      expect(parsed).toEqual({ score: 92 });
    });

    it("normalizes smart quotes and handles trailing commas", () => {
      const smartQuoted = '{\u201Cscore\u201D: 95, \u201Cname\u201D: \u201CTest\u201D,}';
      const parsed = safeJsonParse(smartQuoted, { score: 0, name: "" });
      expect(parsed).toEqual({ score: 95, name: "Test" });
    });

    it("returns fallback value on syntax error without throwing", () => {
      const broken = '{"score": 92, missing_closing_brace';
      const fallback = { score: -1 };
      const result = safeJsonParse(broken, fallback);
      expect(result).toBe(fallback);
    });

    it("returns fallback on empty or non-string input", () => {
      const fallback = { default: true };
      expect(safeJsonParse("", fallback)).toBe(fallback);
      expect(safeJsonParse(null, fallback)).toBe(fallback);
      expect(safeJsonParse(undefined, fallback)).toBe(fallback);
    });
  });

  describe("formatSize", () => {
    it("formats 0 bytes as '0 Bytes'", () => {
      expect(formatSize(0)).toBe("0 Bytes");
    });

    it("handles negative, NaN, and invalid numbers safely", () => {
      expect(formatSize(-100)).toBe("0 Bytes");
      expect(formatSize(NaN)).toBe("0 Bytes");
      expect(formatSize(undefined as any)).toBe("0 Bytes");
    });

    it("formats bytes, kilobytes, and megabytes accurately", () => {
      expect(formatSize(500)).toBe("500 Bytes");
      expect(formatSize(1024)).toBe("1 KB");
      expect(formatSize(1536)).toBe("1.5 KB");
      expect(formatSize(1048576)).toBe("1 MB");
      expect(formatSize(20971520)).toBe("20 MB");
    });
  });

  describe("cn", () => {
    it("merges class names and resolves tailwind conflicts", () => {
      expect(cn("px-2", "py-1")).toBe("px-2 py-1");
      expect(cn("p-2", "p-4")).toBe("p-4");
      expect(cn("base-class", false && "ignored", true && "included")).toBe("base-class included");
    });
  });

  describe("generateUUID", () => {
    it("generates valid standard UUID v4 strings", () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(uuid1).toMatch(uuidRegex);
      expect(uuid2).toMatch(uuidRegex);
      expect(uuid1).not.toBe(uuid2);
    });
  });
});
