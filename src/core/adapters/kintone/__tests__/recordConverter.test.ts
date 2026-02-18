import { describe, expect, it } from "vitest";
import type { SeedRecord } from "@/core/domain/seedData/valueObject";
import { fromKintoneRecord, toKintoneRecord } from "../recordConverter";

type KintoneRecord = Record<string, { value: unknown }> & {
  $id: { value: string };
};

describe("recordConverter", () => {
  describe("toKintoneRecord", () => {
    it("文字列フィールドを変換する", () => {
      const record: SeedRecord = {
        name: "テスト",
        code: "001",
      };
      const result = toKintoneRecord(record);
      expect(result.name).toEqual({ value: "テスト" });
      expect(result.code).toEqual({ value: "001" });
    });

    it("配列フィールドを変換する", () => {
      const record: SeedRecord = {
        code: "001",
        tags: ["VIP", "長期"],
      };
      const result = toKintoneRecord(record);
      expect(result.tags).toEqual({ value: ["VIP", "長期"] });
    });

    it("ユーザーエンティティを変換する", () => {
      const record: SeedRecord = {
        code: "001",
        assignee: [{ code: "user1" }],
      };
      const result = toKintoneRecord(record);
      expect(result.assignee).toEqual({ value: [{ code: "user1" }] });
    });

    it("サブテーブルを変換する", () => {
      const record: SeedRecord = {
        code: "001",
        items: [{ product: "商品A", quantity: "1" }],
      };
      const result = toKintoneRecord(record);
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
      const result = toKintoneRecord(record);
      expect(result.code).toEqual({ value: "001" });
      expect(result.$id).toBeUndefined();
      expect(result.RECORD_NUMBER).toBeUndefined();
    });

    it("空配列フィールドを変換する", () => {
      const record: SeedRecord = {
        code: "001",
        tags: [],
      };
      const result = toKintoneRecord(record);
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
      const result = toKintoneRecord(record);
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
      const result = toKintoneRecord(record);
      const items = result.items.value as unknown[];
      expect(items).toHaveLength(3);
    });
  });

  describe("fromKintoneRecord", () => {
    it("文字列フィールドを変換する", () => {
      const record = {
        $id: { value: "1" },
        name: { value: "テスト" },
        code: { value: "001" },
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
      expect(result.name).toBe("テスト");
      expect(result.code).toBe("001");
    });

    it("配列フィールドを変換する", () => {
      const record = {
        $id: { value: "1" },
        tags: { value: ["VIP", "長期"] },
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
      expect(result.tags).toEqual(["VIP", "長期"]);
    });

    it("ユーザーエンティティを変換する", () => {
      const record = {
        $id: { value: "1" },
        assignee: { value: [{ code: "user1", name: "User 1" }] },
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
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
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
      const items = result.items as readonly Record<string, string>[];
      expect(items).toHaveLength(1);
      expect(items[0].product).toBe("商品A");
      expect(items[0].quantity).toBe("1");
    });

    it("システムフィールドを除外する", () => {
      const record = {
        $id: { type: "__ID__", value: "1" },
        $revision: { type: "__REVISION__", value: "1" },
        RECORD_NUMBER: { type: "RECORD_NUMBER", value: "1" },
        CREATOR: { type: "CREATOR", value: { code: "admin" } },
        code: { type: "SINGLE_LINE_TEXT", value: "001" },
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
      expect(result.code).toBe("001");
      expect(result.$id).toBeUndefined();
      expect(result.$revision).toBeUndefined();
      expect(result.RECORD_NUMBER).toBeUndefined();
      expect(result.CREATOR).toBeUndefined();
    });

    it("日本語フィールドコードのシステムフィールドをtypeで除外する", () => {
      const record = {
        $id: { type: "__ID__", value: "1" },
        レコード番号: { type: "RECORD_NUMBER", value: "1" },
        作成者: { type: "CREATOR", value: { code: "admin" } },
        作成日時: { type: "CREATED_TIME", value: "2024-01-01T00:00:00Z" },
        更新者: { type: "MODIFIER", value: { code: "admin" } },
        更新日時: { type: "UPDATED_TIME", value: "2024-01-01T00:00:00Z" },
        code: { type: "SINGLE_LINE_TEXT", value: "001" },
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
      expect(result.code).toBe("001");
      expect(result.レコード番号).toBeUndefined();
      expect(result.作成者).toBeUndefined();
      expect(result.作成日時).toBeUndefined();
      expect(result.更新者).toBeUndefined();
      expect(result.更新日時).toBeUndefined();
    });

    it("null値を空文字列に変換する", () => {
      const record = {
        $id: { value: "1" },
        name: { value: null },
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
      expect(result.name).toBe("");
    });

    it("undefined値を空文字列に変換する", () => {
      const record = {
        $id: { value: "1" },
        name: { value: undefined },
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
      expect(result.name).toBe("");
    });

    it("数値を文字列に変換する", () => {
      const record = {
        $id: { value: "1" },
        amount: { value: 12345 },
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
      expect(result.amount).toBe("12345");
    });

    it("空配列をそのまま保持する", () => {
      const record = {
        $id: { value: "1" },
        tags: { value: [] },
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
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
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
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
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
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
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
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
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
      expect(result.code).toBe("001");
      expect(result.ステータス).toBeUndefined();
      expect(result.作業者).toBeUndefined();
      expect(result.カテゴリー).toBeUndefined();
    });

    it("typeプロパティがないフィールドを変換する", () => {
      const record = {
        $id: { value: "1" },
        name: { value: "テスト" },
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
      expect(result.name).toBe("テスト");
    });

    it("数値の配列をString配列に変換する", () => {
      const record = {
        $id: { value: "1" },
        scores: { value: [100, 200, 300] },
      } as unknown as KintoneRecord;

      const result = fromKintoneRecord(record);
      expect(result.scores).toEqual(["100", "200", "300"]);
    });
  });
});
