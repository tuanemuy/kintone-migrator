import { describe, expect, it } from "vitest";
import { detectRecordDiff } from "../recordDiffDetector";

type DiffEntry = {
  type: "added" | "modified" | "deleted";
  key: string;
  value: number;
};

const callbacks = {
  onAdded: (key: string, local: number): DiffEntry => ({
    type: "added",
    key,
    value: local,
  }),
  onModified: (
    key: string,
    local: number,
    remote: number,
  ): DiffEntry | undefined => {
    if (local !== remote) {
      return { type: "modified", key, value: local };
    }
    return undefined;
  },
  onDeleted: (key: string, remote: number): DiffEntry => ({
    type: "deleted",
    key,
    value: remote,
  }),
};

describe("detectRecordDiff", () => {
  it("should detect added entries", () => {
    const result = detectRecordDiff({ a: 1, b: 2 }, {}, callbacks);
    expect(result).toEqual([
      { type: "added", key: "a", value: 1 },
      { type: "added", key: "b", value: 2 },
    ]);
  });

  it("should detect deleted entries", () => {
    const result = detectRecordDiff({}, { x: 10, y: 20 }, callbacks);
    expect(result).toEqual([
      { type: "deleted", key: "x", value: 10 },
      { type: "deleted", key: "y", value: 20 },
    ]);
  });

  it("should detect modified entries", () => {
    const result = detectRecordDiff({ a: 2 }, { a: 1 }, callbacks);
    expect(result).toEqual([{ type: "modified", key: "a", value: 2 }]);
  });

  it("should skip when onModified returns undefined", () => {
    const result = detectRecordDiff({ a: 1 }, { a: 1 }, callbacks);
    expect(result).toEqual([]);
  });

  it("should return empty array for empty records", () => {
    const result = detectRecordDiff({}, {}, callbacks);
    expect(result).toEqual([]);
  });

  it("should detect a mix of added, modified, and deleted entries", () => {
    const result = detectRecordDiff({ a: 1, b: 99 }, { b: 2, c: 3 }, callbacks);
    expect(result).toEqual([
      { type: "added", key: "a", value: 1 },
      { type: "modified", key: "b", value: 99 },
      { type: "deleted", key: "c", value: 3 },
    ]);
  });

  it("should correctly handle V that includes undefined using Object.hasOwn", () => {
    type Entry = {
      type: "added" | "modified" | "deleted";
      key: string;
      value: string | undefined;
    };

    const undefinedCallbacks = {
      onAdded: (key: string, local: string | undefined): Entry => ({
        type: "added",
        key,
        value: local,
      }),
      onModified: (
        key: string,
        local: string | undefined,
        remote: string | undefined,
      ): Entry | undefined => {
        if (local !== remote) {
          return { type: "modified", key, value: local };
        }
        return undefined;
      },
      onDeleted: (key: string, remote: string | undefined): Entry => ({
        type: "deleted",
        key,
        value: remote,
      }),
    };

    // Key "a" exists in local with value undefined, but does NOT exist in remote
    // Should be classified as "added", not "modified"
    const local: Record<string, string | undefined> = { a: undefined };
    const remote: Record<string, string | undefined> = {};

    const result = detectRecordDiff(local, remote, undefinedCallbacks);
    expect(result).toEqual([{ type: "added", key: "a", value: undefined }]);
  });

  it("should detect deleted when key exists in remote with undefined value but not in local", () => {
    type Entry = {
      type: "added" | "modified" | "deleted";
      key: string;
      value: string | undefined;
    };

    const undefinedCallbacks = {
      onAdded: (key: string, local: string | undefined): Entry => ({
        type: "added",
        key,
        value: local,
      }),
      onModified: (
        key: string,
        local: string | undefined,
        remote: string | undefined,
      ): Entry | undefined => {
        if (local !== remote) {
          return { type: "modified", key, value: local };
        }
        return undefined;
      },
      onDeleted: (key: string, remote: string | undefined): Entry => ({
        type: "deleted",
        key,
        value: remote,
      }),
    };

    const local: Record<string, string | undefined> = {};
    const remote: Record<string, string | undefined> = { a: undefined };

    const result = detectRecordDiff(local, remote, undefinedCallbacks);
    expect(result).toEqual([{ type: "deleted", key: "a", value: undefined }]);
  });
});
