import { describe, expect, it } from "vitest";
import { loadAppRevision, saveAppRevision } from "../appRevisionIo";
import { InMemoryFileStorage, testConfigCodec } from "./helpers/shared";

describe("appRevisionIo", () => {
  it("save -> load で revision を round-trip できる", async () => {
    const storage = new InMemoryFileStorage();
    await saveAppRevision(storage, testConfigCodec, "42");

    const loaded = await loadAppRevision(storage, testConfigCodec);
    expect(loaded?.revision).toBe("42");
  });

  it("state がない場合は undefined を返す（初回）", async () => {
    const storage = new InMemoryFileStorage();
    const loaded = await loadAppRevision(storage, testConfigCodec);
    expect(loaded).toBeUndefined();
  });

  it("save は revision のみを書き込む", async () => {
    const storage = new InMemoryFileStorage();
    await saveAppRevision(storage, testConfigCodec, "7");

    const result = await storage.get();
    expect(result.exists).toBe(true);
    if (result.exists) {
      expect(testConfigCodec.parse(result.content)).toEqual({ revision: "7" });
    }
  });
});
