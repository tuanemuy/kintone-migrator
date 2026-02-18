import { describe, expect, it } from "vitest";
import { isBusinessRuleError } from "@/core/domain/error";
import { SeedDataErrorCode } from "../../errorCode";
import { SeedParser } from "../seedParser";

describe("SeedParser エッジケース", () => {
  it("boolean値を文字列に変換する", () => {
    const yaml = `
records:
  - active: true
    deleted: false
`;
    const result = SeedParser.parse(yaml);
    expect(result.records[0].active).toBe("true");
    expect(result.records[0].deleted).toBe("false");
  });

  it("null値を空文字列に変換する", () => {
    const yaml = `
records:
  - name: null
`;
    const result = SeedParser.parse(yaml);
    expect(result.records[0].name).toBe("");
  });

  it("空配列をそのまま保持する", () => {
    const yaml = `
records:
  - code: "001"
    tags: []
`;
    const result = SeedParser.parse(yaml);
    expect(result.records[0].tags).toEqual([]);
  });

  it("数値配列を文字列配列に変換する", () => {
    const yaml = `
records:
  - code: "001"
    numbers:
      - 1
      - 2
      - 3
`;
    const result = SeedParser.parse(yaml);
    expect(result.records[0].numbers).toEqual(["1", "2", "3"]);
  });

  it("サブテーブル行のnull値を空文字列に変換する", () => {
    const yaml = `
records:
  - code: "001"
    items:
      - product: "商品A"
        note: null
`;
    const result = SeedParser.parse(yaml);
    const items = result.records[0].items as readonly Record<string, string>[];
    expect(items[0].note).toBe("");
  });

  it("レコードがオブジェクトでない場合にエラーをスローする（文字列）", () => {
    const yaml = `
records:
  - "not an object"
`;
    try {
      SeedParser.parse(yaml);
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidSeedStructure);
        expect(error.message).toContain("must be an object");
      }
    }
  });

  it("YAMLがオブジェクトでない場合にエラーをスローする", () => {
    try {
      SeedParser.parse("just a string");
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidSeedStructure);
      }
    }
  });

  it("recordsキーがない場合にエラーをスローする", () => {
    const yaml = `
key: code
data:
  - code: "001"
`;
    try {
      SeedParser.parse(yaml);
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidSeedStructure);
        expect(error.message).toContain("records");
      }
    }
  });

  it("キーフィールドの値が配列の場合にエラーをスローする", () => {
    const yaml = `
key: code
records:
  - code:
      - "nested"
    name: "テスト"
`;
    try {
      SeedParser.parse(yaml);
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidSeedStructure);
        expect(error.message).toContain("must be a string");
      }
    }
  });

  it("空白のみのテキストでエラーをスローする", () => {
    try {
      SeedParser.parse("   \n\t  ");
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdEmptySeedText);
      }
    }
  });

  it("空のレコード配列を正常にパースする", () => {
    const yaml = `
records: []
`;
    const result = SeedParser.parse(yaml);
    expect(result.records).toHaveLength(0);
    expect(result.key).toBeNull();
  });

  it("レコードが配列（非オブジェクト）の場合にエラーをスローする", () => {
    const yaml = `
records:
  - [1, 2, 3]
`;
    try {
      SeedParser.parse(yaml);
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidSeedStructure);
      }
    }
  });
});
