import { describe, it, expect, beforeEach } from "vitest";
import {
  installPuterMock,
  resetPuterMock,
  seedPuterKV,
  DEFAULT_MOCK_USER,
} from "../mocks/puterMock";

describe("Puter.js In-Memory Mock Harness", () => {
  let mock: ReturnType<typeof installPuterMock>;

  beforeEach(() => {
    mock = installPuterMock();
    resetPuterMock();
  });

  describe("auth", () => {
    it("reports signed-in user by default", async () => {
      const signedIn = await mock.auth.isSignedIn();
      const user = await mock.auth.getUser();
      expect(signedIn).toBe(true);
      expect(user).toEqual(DEFAULT_MOCK_USER);
    });

    it("handles signOut and signIn transitions", async () => {
      await mock.auth.signOut();
      expect(await mock.auth.isSignedIn()).toBe(false);
      await expect(mock.auth.getUser()).rejects.toThrow("Not signed in");

      await mock.auth.signIn();
      expect(await mock.auth.isSignedIn()).toBe(true);
      expect(await mock.auth.getUser()).toEqual(DEFAULT_MOCK_USER);
    });
  });

  describe("kv", () => {
    it("sets, gets, and deletes key-value pairs", async () => {
      await mock.kv.set("test:1", JSON.stringify({ a: 1 }));
      const retrieved = await mock.kv.get("test:1");
      expect(retrieved).toBe('{"a":1}');

      await mock.kv.del("test:1");
      expect(await mock.kv.get("test:1")).toBeNull();
    });

    it("supports wildcard listing with returnValues=true", async () => {
      seedPuterKV({
        "resume:1": { id: "1", title: "Dev" },
        "resume:2": { id: "2", title: "Designer" },
        "other:3": { id: "3" },
      });

      const listWithValues = (await mock.kv.list("resume:*", true)) as { key: string; value: string }[];
      expect(listWithValues).toHaveLength(2);
      expect(listWithValues.map((i) => i.key)).toContain("resume:1");
      expect(listWithValues.map((i) => i.key)).toContain("resume:2");
      expect(listWithValues.map((i) => i.key)).not.toContain("other:3");

      const listKeysOnly = (await mock.kv.list("resume:*", false)) as string[];
      expect(listKeysOnly).toEqual(["resume:1", "resume:2"]);
    });

    it("lists all keys when pattern is omitted or undefined", async () => {
      seedPuterKV({
        "resume:1": "val1",
        "resume:2": "val2",
        "settings:theme": "dark",
      });

      const noArgs = await (
        mock.kv.list as (pattern?: string) => Promise<string[]>
      )();
      expect(noArgs).toHaveLength(3);

      const undefArg = await (
        mock.kv.list as (pattern?: string) => Promise<string[]>
      )(undefined);
      expect(undefArg).toHaveLength(3);
    });

    it("handles regex special characters in pattern without throwing SyntaxError", async () => {
      seedPuterKV({
        "prefix(test):1": "a",
        "item[0]:x": "b",
        "user.profile.dev": "c",
        "userXprofileXdev": "d",
        "price+$100": "e",
      });

      const parenKeys = (await mock.kv.list("prefix(*")) as string[];
      expect(parenKeys).toEqual(["prefix(test):1"]);

      const bracketKeys = (await mock.kv.list("item[0]*")) as string[];
      expect(bracketKeys).toEqual(["item[0]:x"]);

      const dotKeys = (await mock.kv.list("user.profile.*")) as string[];
      expect(dotKeys).toEqual(["user.profile.dev"]);

      const specialKeys = (await mock.kv.list("price+$*")) as string[];
      expect(specialKeys).toEqual(["price+$100"]);
    });

    it("flushes all keys cleanly", async () => {
      seedPuterKV({ "a:1": "val1", "b:2": "val2" });
      await mock.kv.flush();
      expect(mock.kvStore.size).toBe(0);
    });
  });

  describe("fs", () => {
    it("uploads and reads files into in-memory store", async () => {
      const sampleFile = new File(["sample resume content"], "jane_doe.pdf", {
        type: "application/pdf",
      });

      const item = await mock.fs.upload([sampleFile]);
      expect(item.path).toContain("jane_doe.pdf");
      expect(item.name).toBe("jane_doe.pdf");

      const blob = await mock.fs.read(item.path);
      expect(blob).toBeDefined();
    });

    it("deletes files from in-memory store", async () => {
      await mock.fs.write("docs/test.txt", "hello world");
      expect(mock.fsStore.has("docs/test.txt")).toBe(true);

      await mock.fs.delete("docs/test.txt");
      expect(mock.fsStore.has("docs/test.txt")).toBe(false);
    });
  });

  describe("ai", () => {
    it("returns standard structured Gemini feedback by default", async () => {
      const response = await mock.ai.chat("Analyze this resume");
      expect(response.message.content).toBeDefined();

      const parsed = JSON.parse(response.message.content);
      expect(parsed.overallScore).toBe(82);
      expect(parsed.ATS.score).toBe(85);
    });

    it("supports custom mock AI response override", async () => {
      mock.customAiResponse = JSON.stringify({ overallScore: 99, custom: true });
      const response = await mock.ai.chat("Analyze");
      const parsed = JSON.parse(response.message.content);
      expect(parsed.overallScore).toBe(99);
      expect(parsed.custom).toBe(true);
    });
  });
});
