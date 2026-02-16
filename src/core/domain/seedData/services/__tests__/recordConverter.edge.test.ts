import { describe, expect, it } from "vitest";
import type { KintoneRecordForResponse } from "../../ports/recordManager";
import type { SeedRecord } from "../../valueObject";
import { RecordConverter } from "../recordConverter";

describe("RecordConverter エッジケース", () => {
  describe("toKintoneRecord", () => {
    it("空配列フィールドを変換する", () => {
      const record: SeedRecord = {
        code: "001",
        tags: [],
      };
      const result = RecordConverter.toKintoneRecord(record);
      expect(result.tags).toEqual({ value: [] });
    });

    it("全てのシステムフィールドを除外する", () => {
      const record: SeedRecord = {
        code: "001",
        $id: "1",
        $revision: "1",
        RECORD_NUMBER: "1",
        CREATOR: "admin",
        CREATED_TIME: "2024-01-01",
        MODIFIER: "admin",
        UPDATED_TIME: "2024-01-01",
        STATUS: "active",
        STATUS_ASSIGNEE: "user1",
        CATEGORY: "cat1",
      };
      const result = RecordConverter.toKintoneRecord(record);
      expect(result.code).toEqual({ value: "001" });
      expect(result.$id).toBeUndefined();
      expect(result.$revision).toBeUndefined();
      expect(result.RECORD_NUMBER).toBeUndefined();
      expect(result.CREATOR).toBeUndefined();
      expect(result.CREATED_TIME).toBeUndefined();
      expect(result.MODIFIER).toBeUndefined();
      expect(result.UPDATED_TIME).toBeUndefined();
      expect(result.STATUS).toBeUndefined();
      expect(result.STATUS_ASSIGNEE).toBeUndefined();
      expect(result.CATEGORY).toBeUndefined();
    });

    it("複数のサブテーブル行を変換する", () => {
      const record: SeedRecord = {
        code: "001",
        items: [
          { product: "商品A", quantity: "1" },
          { product: "商品B", quantity: "2" },
          { product: "商品C", quantity: "3" },
        ],
      };
      const result = RecordConverter.toKintoneRecord(record);
      const items = result.items.value as unknown[];
      expect(items).toHaveLength(3);
    });
  });

  describe("fromKintoneRecord", () => {
    it("null値を空文字列に変換する", () => {
      const record = {
        $id: { value: "1" },
        name: { value: null },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      expect(result.name).toBe("");
    });

    it("undefined値を空文字列に変換する", () => {
      const record = {
        $id: { value: "1" },
        name: { value: undefined },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      expect(result.name).toBe("");
    });

    it("数値を文字列に変換する", () => {
      const record = {
        $id: { value: "1" },
        amount: { value: 12345 },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      expect(result.amount).toBe("12345");
    });

    it("空配列をそのまま保持する", () => {
      const record = {
        $id: { value: "1" },
        tags: { value: [] },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      expect(result.tags).toEqual([]);
    });

    it("サブテーブル内のシステムフィールドを除外する", () => {
      const record = {
        $id: { value: "1" },
        items: {
          value: [
            {
              id: "100",
              value: {
                product: { value: "商品A" },
                $id: { value: "100" },
                RECORD_NUMBER: { value: "1" },
              },
            },
          ],
        },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      const items = result.items as readonly Record<string, string>[];
      expect(items[0].product).toBe("商品A");
      expect(items[0].$id).toBeUndefined();
      expect(items[0].RECORD_NUMBER).toBeUndefined();
    });

    it("サブテーブル内の配列フィールドを変換する", () => {
      const record = {
        $id: { value: "1" },
        items: {
          value: [
            {
              id: "100",
              value: {
                tags: { value: ["tag1", "tag2"] },
              },
            },
          ],
        },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      const items = result.items as readonly Record<
        string,
        string | readonly string[]
      >[];
      expect(items[0].tags).toEqual(["tag1", "tag2"]);
    });

    it("サブテーブル内のnull値を空文字列に変換する", () => {
      const record = {
        $id: { value: "1" },
        items: {
          value: [
            {
              id: "100",
              value: {
                product: { value: null },
              },
            },
          ],
        },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      const items = result.items as readonly Record<string, string>[];
      expect(items[0].product).toBe("");
    });

    it("全てのシステムフィールドタイプを除外する", () => {
      const record = {
        $id: { type: "__ID__", value: "1" },
        $revision: { type: "__REVISION__", value: "1" },
        ステータス: { type: "STATUS", value: "処理中" },
        作業者: { type: "STATUS_ASSIGNEE", value: [] },
        カテゴリー: { type: "CATEGORY", value: [] },
        code: { type: "SINGLE_LINE_TEXT", value: "001" },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      expect(result.code).toBe("001");
      expect(result.ステータス).toBeUndefined();
      expect(result.作業者).toBeUndefined();
      expect(result.カテゴリー).toBeUndefined();
    });

    it("typeプロパティがないフィールドを変換する", () => {
      const record = {
        $id: { value: "1" },
        name: { value: "テスト" },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      expect(result.name).toBe("テスト");
    });

    it("数値の配列をString配列に変換する", () => {
      const record = {
        $id: { value: "1" },
        scores: { value: [100, 200, 300] },
      } as unknown as KintoneRecordForResponse;

      const result = RecordConverter.fromKintoneRecord(record);
      expect(result.scores).toEqual(["100", "200", "300"]);
    });
  });
});
