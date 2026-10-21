import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { FormSchemaErrorCode } from "../errorCode";
import {
  FieldCode,
  LookupRelatedApp,
  unsetLookupListAsEmpty,
} from "../valueObject";

describe("FieldCode", () => {
  it("有効な文字列からFieldCodeを生成する", () => {
    const code = FieldCode.create("customer_name");
    expect(String(code)).toBe("customer_name");
  });

  it("空文字を渡すとEmptyFieldCodeエラーが発生する", () => {
    try {
      FieldCode.create("");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        FormSchemaErrorCode.FsEmptyFieldCode,
      );
    }
  });

  it("スラッシュを含むコードはInvalidFieldCodeエラーが発生する", () => {
    try {
      FieldCode.create("foo/bar");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        FormSchemaErrorCode.FsInvalidFieldCode,
      );
    }
  });

  it("バックスラッシュを含むコードはInvalidFieldCodeエラーが発生する", () => {
    try {
      FieldCode.create("foo\\bar");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        FormSchemaErrorCode.FsInvalidFieldCode,
      );
    }
  });

  it("制御文字を含むコードはInvalidFieldCodeエラーが発生する", () => {
    try {
      FieldCode.create("foo\x00bar");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        FormSchemaErrorCode.FsInvalidFieldCode,
      );
    }
  });

  it("DEL文字(0x7f)を含むコードはInvalidFieldCodeエラーが発生する", () => {
    try {
      FieldCode.create("foo\x7fbar");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        FormSchemaErrorCode.FsInvalidFieldCode,
      );
    }
  });

  it("制御文字がエラーメッセージ内でサニタイズされる", () => {
    try {
      FieldCode.create("foo\x00bar");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      const msg = (e as BusinessRuleError).message;
      expect(msg).toContain("foo\\x00bar");
      expect(msg).not.toContain("foo\x00bar");
    }
  });
});

describe("LookupRelatedApp", () => {
  describe("create", () => {
    it.each([
      ["空文字", ""],
      ["undefined", undefined],
    ])("code が%sなら、code を持たない", (_, code) => {
      expect(LookupRelatedApp.create("10", code)).toStrictEqual({ app: "10" });
    });

    it("code が非空なら、code を持つ", () => {
      expect(LookupRelatedApp.create("10", "CUSTOMERS")).toStrictEqual({
        app: "10",
        code: "CUSTOMERS",
      });
    });
  });
});

describe("unsetLookupListAsEmpty", () => {
  it("空文字は空配列にする", () => {
    expect(unsetLookupListAsEmpty("")).toStrictEqual([]);
  });

  it.each([
    ["配列", ["name"]],
    ["空でない文字列", "name"],
    ["undefined", undefined],
  ])("%sはそのまま返す", (_, value) => {
    expect(unsetLookupListAsEmpty(value)).toBe(value);
  });
});
