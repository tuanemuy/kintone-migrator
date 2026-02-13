import { describe, expect, it } from "vitest";
import type { KintoneRecordForResponse } from "@/core/domain/seedData/ports/recordManager";
import {
  setupTestSeedContainer,
  type TestSeedContainer,
} from "../../__tests__/helpers";
import { upsertSeed } from "../upsertSeed";

const getContainer = setupTestSeedContainer();

function makeKintoneRecord(
  id: string,
  fields: Record<string, unknown>,
): KintoneRecordForResponse {
  const record: Record<string, { value: unknown }> = {
    $id: { value: id },
  };
  for (const [key, value] of Object.entries(fields)) {
    record[key] = { value };
  }
  return record as unknown as KintoneRecordForResponse;
}

describe("upsertSeed", () => {
  it("全レコードを追加する（既存レコードなし）", async () => {
    const container: TestSeedContainer = getContainer();
    container.seedStorage.setContent(`
key: code
records:
  - code: "001"
    name: "テスト1"
  - code: "002"
    name: "テスト2"
`);

    const result = await upsertSeed({ container });

    expect(result.added).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(0);
    expect(result.total).toBe(2);
    expect(container.recordManager.callLog).toContain("addRecords");
  });

  it("既存レコードを更新する", async () => {
    const container: TestSeedContainer = getContainer();
    container.recordManager.setRecords([
      makeKintoneRecord("10", { code: "001", name: "更新前" }),
    ]);
    container.seedStorage.setContent(`
key: code
records:
  - code: "001"
    name: "更新後"
`);

    const result = await upsertSeed({ container });

    expect(result.added).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.unchanged).toBe(0);
    expect(result.total).toBe(1);
    expect(container.recordManager.callLog).toContain("updateRecords");
  });

  it("変更なしの場合はadd/updateを呼ばない", async () => {
    const container: TestSeedContainer = getContainer();
    container.recordManager.setRecords([
      makeKintoneRecord("10", { code: "001", name: "テスト" }),
    ]);
    container.seedStorage.setContent(`
key: code
records:
  - code: "001"
    name: "テスト"
`);

    const result = await upsertSeed({ container });

    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(1);
    expect(result.total).toBe(1);
    expect(container.recordManager.callLog).not.toContain("addRecords");
    expect(container.recordManager.callLog).not.toContain("updateRecords");
  });

  it("追加・更新・変更なしを混在して処理する", async () => {
    const container: TestSeedContainer = getContainer();
    container.recordManager.setRecords([
      makeKintoneRecord("10", { code: "001", name: "変更なし" }),
      makeKintoneRecord("20", { code: "002", name: "更新前" }),
    ]);
    container.seedStorage.setContent(`
key: code
records:
  - code: "001"
    name: "変更なし"
  - code: "002"
    name: "更新後"
  - code: "003"
    name: "新規"
`);

    const result = await upsertSeed({ container });

    expect(result.added).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.unchanged).toBe(1);
    expect(result.total).toBe(3);
  });
});
