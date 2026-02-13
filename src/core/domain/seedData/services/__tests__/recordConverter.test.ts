import { describe, expect, it } from "vitest";
import type { KintoneRecordForResponse } from "../../ports/recordManager";
import type { SeedRecord } from "../../valueObject";
import { RecordConverter } from "../recordConverter";

describe("RecordConverter", () => {
  describe("toKintoneRecord", () => {
    it("文字列フィールドを変換する", () => {
      const record: SeedRecord = {
        name: "テスト",
        code: "001",
      };
      const result = RecordConverter.toKintoneRecord(record);
      expect(result.name).toEqual({ value: "テスト" });
      expect(result.code).toEqual({ value: "001" });
    });

    it("配列フィールドを変換する", () => {
      const record: SeedRecord = {
        code: "001",
        tags: ["VIP", "長期"],
      };
      const result = RecordConverter.toKintoneRecord(record);
      expect(result.tags).toEqual({ value: ["VIP", "長期"] });
    });

    it("ユーザーエンティティを変換する", () => {
      const record: SeedRecord = {
        code: "001",
        assignee: [{ code: "user1" }],
      };
      const result = RecordConverter.toKintoneRecord(record);
      expect(result.assignee).toEqual({ value: [{ code: "user1" }] });
    });

    it("サブテーブルを変換する", () => {
      const record: SeedRecord = {
        code: "001",
        items: [{ product: "商品A", quantity: "1" }],
      };
      const result = RecordConverter.toKintoneRecord(record);
      expect(result.items).toEqual({
        value: [
          {
            value: {
              product: { value: "商品A" },
              quantity: { value: "1" },
            },
          },
        ],
      });
    });

    it("システムフィールドを除外する", () => {
      const record: SeedRecord = {
        code: "001",
        $id: "1",
        RECORD_NUMBER: "1",
      };
      const result = RecordConverter.toKintoneRecord(record);
      expect(result.code).toEqual({ value: "001" });
      expect(result.$id).toBeUndefined();
      expect(result.RECORD_NUMBER).toBeUndefined();
    });
  });

  describe("fromKintoneRecord", () => {
    it("文字列フィールドを変換する", () => {
      const record = {
        $id: { value: "1" },
        name: { value: "テスト" },
        code: { value: "001" },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      expect(result.name).toBe("テスト");
      expect(result.code).toBe("001");
    });

    it("配列フィールドを変換する", () => {
      const record = {
        $id: { value: "1" },
        tags: { value: ["VIP", "長期"] },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      expect(result.tags).toEqual(["VIP", "長期"]);
    });

    it("ユーザーエンティティを変換する", () => {
      const record = {
        $id: { value: "1" },
        assignee: { value: [{ code: "user1", name: "User 1" }] },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      expect(result.assignee).toEqual([{ code: "user1" }]);
    });

    it("サブテーブルを変換する", () => {
      const record = {
        $id: { value: "1" },
        items: {
          value: [
            {
              id: "1",
              value: {
                product: { value: "商品A" },
                quantity: { value: "1" },
              },
            },
          ],
        },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      const items = result.items as readonly Record<string, string>[];
      expect(items).toHaveLength(1);
      expect(items[0].product).toBe("商品A");
      expect(items[0].quantity).toBe("1");
    });

    it("システムフィールドを除外する", () => {
      const record = {
        $id: { value: "1" },
        $revision: { value: "1" },
        RECORD_NUMBER: { value: "1" },
        CREATOR: { value: { code: "admin" } },
        code: { value: "001" },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      expect(result.code).toBe("001");
      expect(result.$id).toBeUndefined();
      expect(result.$revision).toBeUndefined();
      expect(result.RECORD_NUMBER).toBeUndefined();
      expect(result.CREATOR).toBeUndefined();
    });
  });
});
