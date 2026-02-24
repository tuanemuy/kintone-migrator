import { describe, expect, it } from "vitest";
import { isBusinessRuleError } from "@/core/domain/error";
import { SeedDataErrorCode } from "../../errorCode";
import { SeedParser } from "../seedParser";

describe("SeedParser", () => {
  it("有効なYAMLをパースする", () => {
    const yaml = `
key: customer_code
records:
  - customer_code: "C001"
    name: "テスト株式会社"
  - customer_code: "C002"
    name: "サンプル株式会社"
`;
    const result = SeedParser.parse(yaml);
    expect(result.key).toBe("customer_code");
    expect(result.records).toHaveLength(2);
    expect(result.records[0].customer_code).toBe("C001");
    expect(result.records[0].name).toBe("テスト株式会社");
    expect(result.records[1].customer_code).toBe("C002");
  });

  it("配列フィールドをパースする", () => {
    const yaml = `
key: code
records:
  - code: "001"
    tags:
      - "VIP"
      - "長期"
`;
    const result = SeedParser.parse(yaml);
    expect(result.records[0].tags).toEqual(["VIP", "長期"]);
  });

  it("ユーザーエンティティ配列をパースする", () => {
    const yaml = `
key: code
records:
  - code: "001"
    assignee:
      - code: "user1"
      - code: "user2"
`;
    const result = SeedParser.parse(yaml);
    expect(result.records[0].assignee).toEqual([
      { code: "user1" },
      { code: "user2" },
    ]);
  });

  it("サブテーブル行をパースする", () => {
    const yaml = `
key: code
records:
  - code: "001"
    items:
      - product: "商品A"
        quantity: 1
        price: 1000
`;
    const result = SeedParser.parse(yaml);
    const items = result.records[0].items as readonly Record<string, string>[];
    expect(items).toHaveLength(1);
    expect(items[0].product).toBe("商品A");
    expect(items[0].quantity).toBe("1");
    expect(items[0].price).toBe("1000");
  });

  it("サブテーブル行内の配列フィールドをパースする", () => {
    const yaml = `
key: code
records:
  - code: "001"
    items:
      - product: "商品A"
        options:
          - "オプション1"
          - "オプション2"
`;
    const result = SeedParser.parse(yaml);
    const items = result.records[0].items as readonly Record<
      string,
      string | readonly string[]
    >[];
    expect(items).toHaveLength(1);
    expect(items[0].product).toBe("商品A");
    expect(items[0].options).toEqual(["オプション1", "オプション2"]);
  });

  it("数値を文字列に変換する", () => {
    const yaml = `
key: code
records:
  - code: "001"
    amount: 1000
`;
    const result = SeedParser.parse(yaml);
    expect(result.records[0].amount).toBe("1000");
  });

  it("空テキストでエラーをスローする", () => {
    try {
      SeedParser.parse("");
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdEmptySeedText);
      }
    }
  });

  it("無効なYAMLでエラーをスローする", () => {
    try {
      SeedParser.parse("{ invalid yaml:");
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidSeedYaml);
      }
    }
  });

  it("keyフィールドがない場合はnullとしてパースする", () => {
    const yaml = `
records:
  - name: "テスト1"
  - name: "テスト2"
`;
    const result = SeedParser.parse(yaml);
    expect(result.key).toBeNull();
    expect(result.records).toHaveLength(2);
    expect(result.records[0].name).toBe("テスト1");
    expect(result.records[1].name).toBe("テスト2");
  });

  it("keyなし時にキーフィールド検証がスキップされる", () => {
    const yaml = `
records:
  - name: "テスト1"
    code: "001"
  - name: "テスト2"
`;
    const result = SeedParser.parse(yaml);
    expect(result.key).toBeNull();
    expect(result.records).toHaveLength(2);
  });

  it("keyなし時に重複値があってもエラーにならない", () => {
    const yaml = `
records:
  - name: "同じ名前"
  - name: "同じ名前"
`;
    const result = SeedParser.parse(yaml);
    expect(result.key).toBeNull();
    expect(result.records).toHaveLength(2);
  });

  it("recordsが配列でない場合にエラーをスローする", () => {
    try {
      SeedParser.parse("key: code\nrecords: not_array");
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidSeedStructure);
      }
    }
  });

  it("レコードにキーフィールドがない場合にエラーをスローする", () => {
    const yaml = `
key: code
records:
  - name: "テスト"
`;
    try {
      SeedParser.parse(yaml);
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdMissingKeyField);
      }
    }
  });

  it("キー値が重複する場合にエラーをスローする", () => {
    const yaml = `
key: code
records:
  - code: "001"
    name: "テスト1"
  - code: "001"
    name: "テスト2"
`;
    try {
      SeedParser.parse(yaml);
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdDuplicateKeyValue);
      }
    }
  });
});
