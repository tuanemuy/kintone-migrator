import { describe, expect, it } from "vitest";
import type { KintoneRecordForResponse } from "../../ports/recordManager";
import type { UpsertKey } from "../../valueObject";
import { UpsertPlanner } from "../upsertPlanner";

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

describe("UpsertPlanner", () => {
  const key = "code" as UpsertKey;

  it("全レコードを追加として分類する（既存レコードなし）", () => {
    const seedRecords = [
      { code: "001", name: "テスト1" },
      { code: "002", name: "テスト2" },
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, []);

    expect(plan.toAdd).toHaveLength(2);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.unchanged).toBe(0);
  });

  it("既存レコードと一致する場合はunchangedとして分類する", () => {
    const seedRecords = [{ code: "001", name: "テスト1" }];

    const existingRecords = [
      makeKintoneRecord("10", { code: "001", name: "テスト1" }),
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);

    expect(plan.toAdd).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });

  it("既存レコードと異なる場合はupdateとして分類する", () => {
    const seedRecords = [{ code: "001", name: "更新後" }];

    const existingRecords = [
      makeKintoneRecord("10", { code: "001", name: "更新前" }),
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);

    expect(plan.toAdd).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toUpdate[0].id).toBe("10");
    expect(plan.toUpdate[0].record.name).toBe("更新後");
    expect(plan.unchanged).toBe(0);
  });

  it("追加・更新・変更なしを混在して分類する", () => {
    const seedRecords = [
      { code: "001", name: "変更なし" },
      { code: "002", name: "更新後" },
      { code: "003", name: "新規" },
    ];

    const existingRecords = [
      makeKintoneRecord("10", { code: "001", name: "変更なし" }),
      makeKintoneRecord("20", { code: "002", name: "更新前" }),
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);

    expect(plan.toAdd).toHaveLength(1);
    expect(plan.toAdd[0].code).toBe("003");
    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toUpdate[0].id).toBe("20");
    expect(plan.unchanged).toBe(1);
  });

  it("配列フィールドの比較が正しく動作する", () => {
    const seedRecords = [{ code: "001", tags: ["VIP", "長期"] }];

    const existingRecords = [
      makeKintoneRecord("10", { code: "001", tags: ["VIP", "長期"] }),
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);

    expect(plan.unchanged).toBe(1);
    expect(plan.toUpdate).toHaveLength(0);
  });

  it("配列フィールドの内容が異なる場合はupdateとして分類する", () => {
    const seedRecords = [{ code: "001", tags: ["VIP", "短期"] }];

    const existingRecords = [
      makeKintoneRecord("10", { code: "001", tags: ["VIP", "長期"] }),
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);

    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.unchanged).toBe(0);
  });
});
