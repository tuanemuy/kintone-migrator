import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { FormSchemaErrorCode } from "@/core/domain/formSchema/errorCode";
import {
  InMemoryFileStorage,
  testConfigCodec,
} from "../../__tests__/helpers/shared";
import { loadSnapshotState, saveSnapshotState } from "../stateIo";

type Snapshot = { value: string };

const serialize = (s: Snapshot): Record<string, unknown> => ({
  value: s.value,
});
const parse = (parsed: unknown): Snapshot => {
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { value?: unknown }).value !== "string"
  ) {
    throw new BusinessRuleError(
      FormSchemaErrorCode.FsInvalidStateStructure,
      "invalid snapshot",
    );
  }
  return { value: (parsed as { value: string }).value };
};

describe("threeWay stateIo", () => {
  it("save -> load で snapshot を round-trip できる", async () => {
    const storage = new InMemoryFileStorage();
    await saveSnapshotState(storage, testConfigCodec, serialize, {
      value: "x",
    });

    const loaded = await loadSnapshotState(
      storage,
      testConfigCodec,
      parse,
      "Test state",
    );
    expect(loaded).toEqual({ value: "x" });
  });

  it("state がない場合は undefined を返す（初回）", async () => {
    const storage = new InMemoryFileStorage();
    const loaded = await loadSnapshotState(
      storage,
      testConfigCodec,
      parse,
      "Test state",
    );
    expect(loaded).toBeUndefined();
  });

  it("不正な内容は domain parse エラーを application エラーへ翻訳する", async () => {
    const storage = new InMemoryFileStorage();
    storage.setContent(testConfigCodec.stringify({ wrong: true }));

    await expect(
      loadSnapshotState(storage, testConfigCodec, parse, "Test state"),
    ).rejects.toThrowError();
  });
});
