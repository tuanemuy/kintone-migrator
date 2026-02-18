import { describe, expect, it } from "vitest";
import { isBusinessRuleError } from "@/core/domain/error";
import type { SeedRecordWithId } from "../../entity";
import { SeedDataErrorCode } from "../../errorCode";
import type { SeedRecord, UpsertKey } from "../../valueObject";
import { UpsertPlanner } from "../upsertPlanner";

function makeSeedRecord(id: string, record: SeedRecord): SeedRecordWithId {
  return { id, record };
}

describe("UpsertPlanner エッジケース", () => {
  const key = "code" as UpsertKey;

  it("オブジェクト配列（サブテーブル）の比較で一致する場合はunchanged", () => {
    const seedRecords = [
      {
        code: "001",
        items: [
          { product: "商品A", quantity: "1" },
          { product: "商品B", quantity: "2" },
        ],
      },
    ];

    // existingRecords already have converted SeedRecord format (adapter handles conversion)
    const existingRecords = [
      makeSeedRecord("10", {
        code: "001",
        items: [
          { product: "商品A", quantity: "1" },
          { product: "商品B", quantity: "2" },
        ],
      }),
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);
    expect(plan.unchanged).toBe(1);
    expect(plan.toUpdate).toHaveLength(0);
  });

  it("オブジェクト配列のキー数が異なる場合はupdateとして分類する", () => {
    const seedRecords = [
      {
        code: "001",
        items: [{ product: "商品A", quantity: "1", note: "メモ" }],
      },
    ];

    const existingRecords = [
      makeSeedRecord("10", {
        code: "001",
        items: [{ product: "商品A", quantity: "1" }],
      }),
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);
    expect(plan.toUpdate).toHaveLength(1);
  });

  it("オブジェクト配列の値が異なる場合はupdateとして分類する", () => {
    const seedRecords = [
      {
        code: "001",
        items: [{ product: "商品A", quantity: "99" }],
      },
    ];

    const existingRecords = [
      makeSeedRecord("10", {
        code: "001",
        items: [{ product: "商品A", quantity: "1" }],
      }),
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);
    expect(plan.toUpdate).toHaveLength(1);
  });

  it("配列の長さが異なる場合はupdateとして分類する", () => {
    const seedRecords = [
      {
        code: "001",
        tags: ["VIP"],
      },
    ];

    const existingRecords = [
      makeSeedRecord("10", { code: "001", tags: ["VIP", "長期"] }),
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);
    expect(plan.toUpdate).toHaveLength(1);
  });

  it("seedにあってexistingにないフィールドがある場合はupdateとして分類する", () => {
    const seedRecords = [
      {
        code: "001",
        name: "テスト",
        newField: "新しい値",
      },
    ];

    const existingRecords = [
      makeSeedRecord("10", { code: "001", name: "テスト" }),
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);
    expect(plan.toUpdate).toHaveLength(1);
  });

  it("キーフィールドの値が文字列でない場合にBusinessRuleErrorをスローする", () => {
    const seedRecords = [
      {
        code: ["配列値"] as unknown as string,
        name: "テスト",
      },
    ];

    try {
      UpsertPlanner.plan(key, seedRecords, []);
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidKeyFieldValue);
      }
    }
  });

  it("空の配列同士の比較はunchangedとして分類する", () => {
    const seedRecords = [
      {
        code: "001",
        tags: [] as string[],
      },
    ];

    const existingRecords = [makeSeedRecord("10", { code: "001", tags: [] })];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);
    expect(plan.unchanged).toBe(1);
  });

  it("既存レコードのキーフィールドが文字列でない場合はマップに追加されない", () => {
    const seedRecords = [
      {
        code: "001",
        name: "テスト",
      },
    ];

    // 既存レコードのキーフィールドが配列の場合
    const existingRecords = [
      makeSeedRecord("10", {
        code: ["not", "a", "string"] as unknown as string,
        name: "テスト",
      }),
    ];

    const plan = UpsertPlanner.plan(key, seedRecords, existingRecords);
    // 既存レコードがマップに入らないのでseedは全てaddになる
    expect(plan.toAdd).toHaveLength(1);
  });
});
