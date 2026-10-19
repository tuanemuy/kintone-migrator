import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { FormSchemaErrorCode } from "../errorCode";
import { FieldCode, omitEmptyLookupRelatedAppCode } from "../valueObject";

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

describe("omitEmptyLookupRelatedAppCode", () => {
  const lookupWith = (relatedApp: unknown) => ({
    required: true,
    lookup: {
      relatedApp,
      relatedKeyField: "customer_code",
      fieldMappings: [{ field: "name", relatedField: "customer_name" }],
      lookupPickerFields: ["customer_name"],
    },
  });

  it.each([
    ["空文字", { app: "10", code: "" }],
    ["値なし（null）", { app: "10", code: null }],
  ])("relatedApp.code が%sなら code を省き、他のプロパティは保つ", (_, relatedApp) => {
    expect(omitEmptyLookupRelatedAppCode(lookupWith(relatedApp))).toStrictEqual(
      lookupWith({ app: "10" }),
    );
  });

  it("relatedApp.code が非空ならそのまま返す", () => {
    expect(
      omitEmptyLookupRelatedAppCode(
        lookupWith({ app: "10", code: "CUSTOMERS" }),
      ),
    ).toStrictEqual(lookupWith({ app: "10", code: "CUSTOMERS" }));
  });

  it("relatedApp が code を持たなければそのまま返す", () => {
    expect(
      omitEmptyLookupRelatedAppCode(lookupWith({ app: "10" })),
    ).toStrictEqual(lookupWith({ app: "10" }));
  });

  it("lookup を持たないプロパティに lookup キーを足さない", () => {
    expect(omitEmptyLookupRelatedAppCode({ required: true })).toStrictEqual({
      required: true,
    });
  });

  it.each([
    ["lookup が record でない", { lookup: "x" }],
    ["lookup が null", { lookup: null }],
    ["relatedApp が record でない", { lookup: { relatedApp: "10" } }],
    ["relatedApp が無い", { lookup: { relatedKeyField: "k" } }],
  ])("%s ときは値を変えずに返す", (_, properties) => {
    expect(omitEmptyLookupRelatedAppCode(properties)).toBe(properties);
  });

  it("引数のプロパティを書き換えない", () => {
    const properties = lookupWith({ app: "10", code: "" });

    omitEmptyLookupRelatedAppCode(properties);

    expect(properties).toStrictEqual(lookupWith({ app: "10", code: "" }));
  });
});
