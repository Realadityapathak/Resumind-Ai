import { describe, it, expect, beforeEach } from "vitest";
import { usePuterStore } from "~/services/puter/store";
import { installPuterMock, resetPuterMock, puterMock } from "../mocks/puterMock";

describe("Puter KV store adapter", () => {
  beforeEach(() => {
    installPuterMock();
    resetPuterMock();
  });

  it("delegates the public kv.delete API to the SDK's kv.del method", async () => {
    await puterMock.kv.set("resume:adapter-test", '{"id":"adapter-test"}');

    const deleted = await usePuterStore
      .getState()
      .kv.delete("resume:adapter-test");

    expect(puterMock.kv.del).toHaveBeenCalledWith("resume:adapter-test");
    expect(deleted).toBe(true);
    expect(puterMock.kvStore.has("resume:adapter-test")).toBe(false);
  });
});
