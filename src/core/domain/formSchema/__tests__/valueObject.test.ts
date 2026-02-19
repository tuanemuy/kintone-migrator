import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { FormSchemaErrorCode } from "../errorCode";
import { FieldCode } from "../valueObject";

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
});
