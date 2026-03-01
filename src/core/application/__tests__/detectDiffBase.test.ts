import { describe, expect, it, vi } from "vitest";
import { buildDiffResult } from "@/core/domain/diff";
import { detectDiffFromConfig } from "../detectDiffBase";
import { ValidationError, ValidationErrorCode } from "../error";

type TestEntry = { type: "added" | "modified" | "deleted"; name: string };

describe("detectDiffFromConfig", () => {
  it("should return diff result when storage exists", async () => {
    const expectedResult = buildDiffResult<TestEntry>([
      { type: "added", name: "item1" },
    ]);

    const result = await detectDiffFromConfig({
      getStorage: vi.fn().mockResolvedValue({ exists: true, content: "data" }),
      fetchRemote: vi.fn().mockResolvedValue({ items: [] }),
      parseConfig: vi.fn().mockReturnValue({ parsed: true }),
      detect: vi.fn().mockReturnValue(expectedResult),
      notFoundMessage: "Not found",
    });

    expect(result).toBe(expectedResult);
  });

  it("should call getStorage and fetchRemote in parallel", async () => {
    const callOrder: string[] = [];
    const getStorage = vi.fn().mockImplementation(async () => {
      callOrder.push("storage-start");
      await new Promise((r) => setTimeout(r, 10));
      callOrder.push("storage-end");
      return { exists: true, content: "data" };
    });
    const fetchRemote = vi.fn().mockImplementation(async () => {
      callOrder.push("remote-start");
      await new Promise((r) => setTimeout(r, 10));
      callOrder.push("remote-end");
      return {};
    });

    await detectDiffFromConfig({
      getStorage,
      fetchRemote,
      parseConfig: vi.fn().mockReturnValue({}),
      detect: vi.fn().mockReturnValue(buildDiffResult([])),
      notFoundMessage: "Not found",
    });

    expect(getStorage).toHaveBeenCalledOnce();
    expect(fetchRemote).toHaveBeenCalledOnce();
    // Both should start before either finishes
    expect(callOrder.indexOf("storage-start")).toBeLessThan(
      callOrder.indexOf("storage-end"),
    );
    expect(callOrder.indexOf("remote-start")).toBeLessThan(
      callOrder.indexOf("remote-end"),
    );
  });

  it("should throw ValidationError when storage does not exist", async () => {
    await expect(
      detectDiffFromConfig({
        getStorage: vi.fn().mockResolvedValue({ exists: false }),
        fetchRemote: vi.fn().mockResolvedValue({}),
        parseConfig: vi.fn(),
        detect: vi.fn(),
        notFoundMessage: "Config not found",
      }),
    ).rejects.toThrow(ValidationError);

    try {
      await detectDiffFromConfig({
        getStorage: vi.fn().mockResolvedValue({ exists: false }),
        fetchRemote: vi.fn().mockResolvedValue({}),
        parseConfig: vi.fn(),
        detect: vi.fn(),
        notFoundMessage: "Config not found",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.code).toBe(ValidationErrorCode.InvalidInput);
      expect(validationError.message).toBe("Config not found");
    }
  });

  it("should pass parsed config and remote to detect", async () => {
    const parsedLocal = { field: "value" };
    const remoteData = { items: [1, 2, 3] };
    const detect = vi.fn().mockReturnValue(buildDiffResult([]));

    await detectDiffFromConfig({
      getStorage: vi.fn().mockResolvedValue({ exists: true, content: "raw" }),
      fetchRemote: vi.fn().mockResolvedValue(remoteData),
      parseConfig: vi.fn().mockReturnValue(parsedLocal),
      detect,
      notFoundMessage: "Not found",
    });

    expect(detect).toHaveBeenCalledWith(parsedLocal, remoteData);
  });
});
