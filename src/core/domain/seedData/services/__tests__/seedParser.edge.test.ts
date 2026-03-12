import { describe, expect, it } from "vitest";
import { isBusinessRuleError } from "@/core/domain/error";
import { SeedDataErrorCode } from "../../errorCode";
import { SeedParser } from "../seedParser";

describe("SeedParser エッジケース", () => {
  it("boolean値を文字列に変換する", () => {
    const input = {
      records: [{ active: true, deleted: false }],
    };
    const result = SeedParser.parse(input);
    expect(result.records[0].active).toBe("true");
    expect(result.records[0].deleted).toBe("false");
  });

  it("null値を空文字列に変換する", () => {
    const input = {
      records: [{ name: null }],
    };
    const result = SeedParser.parse(input);
    expect(result.records[0].name).toBe("");
  });

  it("空配列をそのまま保持する", () => {
    const input = {
      records: [{ code: "001", tags: [] }],
    };
    const result = SeedParser.parse(input);
    expect(result.records[0].tags).toEqual([]);
  });

  it("数値配列を文字列配列に変換する", () => {
    const input = {
      records: [{ code: "001", numbers: [1, 2, 3] }],
    };
    const result = SeedParser.parse(input);
    expect(result.records[0].numbers).toEqual(["1", "2", "3"]);
  });

  it("サブテーブル行のnull値を空文字列に変換する", () => {
    const input = {
      records: [{ code: "001", items: [{ product: "商品A", note: null }] }],
    };
    const result = SeedParser.parse(input);
    const items = result.records[0].items as readonly Record<string, string>[];
    expect(items[0].note).toBe("");
  });

  it("レコードがオブジェクトでない場合にエラーをスローする（文字列）", () => {
    const input = {
      records: ["not an object"],
    };
    try {
      SeedParser.parse(input);
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidSeedStructure);
        expect(error.message).toContain("must be an object");
      }
    }
  });

  it("オブジェクトでない値を渡すとエラーをスローする", () => {
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
    const input = {
      key: "code",
      data: [{ code: "001" }],
    };
    try {
      SeedParser.parse(input);
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
    const input = {
      key: "code",
      records: [{ code: ["nested"], name: "テスト" }],
    };
    try {
      SeedParser.parse(input);
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidSeedStructure);
        expect(error.message).toContain("must be a string");
      }
    }
  });

  it("空のレコード配列を正常にパースする", () => {
    const input = { records: [] };
    const result = SeedParser.parse(input);
    expect(result.records).toHaveLength(0);
    expect(result.key).toBeNull();
  });

  it("レコードが配列（非オブジェクト）の場合にエラーをスローする", () => {
    const input = {
      records: [[1, 2, 3]],
    };
    try {
      SeedParser.parse(input);
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidSeedStructure);
      }
    }
  });

  it("未対応の値型（object等）でエラーをスローする", () => {
    const input = {
      records: [{ code: "001", nested: { key: "value" } }],
    };
    try {
      SeedParser.parse(input);
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.SdInvalidSeedStructure);
        expect(error.message).toContain("Unsupported value type");
      }
    }
  });
});
