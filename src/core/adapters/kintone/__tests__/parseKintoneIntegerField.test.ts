import { describe, expect, it } from "vitest";
import { SystemError } from "@/core/application/error";
import { parseKintoneIntegerField } from "../parseKintoneIntegerField";

describe("parseKintoneIntegerField", () => {
  it("正常な整数文字列をパースする", () => {
    expect(parseKintoneIntegerField("0", "field")).toBe(0);
    expect(parseKintoneIntegerField("1", "field")).toBe(1);
    expect(parseKintoneIntegerField("42", "field")).toBe(42);
    expect(parseKintoneIntegerField("-1", "field")).toBe(-1);
  });

  it("小数を含む文字列は SystemError をスローする", () => {
    expect(() => parseKintoneIntegerField("3.5", "field")).toThrow(SystemError);
    expect(() => parseKintoneIntegerField("1.7", "field")).toThrow(SystemError);
  });

  it("整数に丸められる小数 (1.0) は整数として受理される", () => {
    // Number("1.0") === 1, which isInteger(1) === true
    expect(parseKintoneIntegerField("1.0", "field")).toBe(1);
  });

  it("Infinity は SystemError をスローする", () => {
    expect(() => parseKintoneIntegerField("Infinity", "field")).toThrow(
      SystemError,
    );
    expect(() => parseKintoneIntegerField("-Infinity", "field")).toThrow(
      SystemError,
    );
  });

  it("NaN は SystemError をスローする", () => {
    expect(() => parseKintoneIntegerField("NaN", "field")).toThrow(SystemError);
  });

  it("空文字列は整数 0 としてパースされる", () => {
    // Number("") === 0 — isFinite and isInteger both pass.
    // This is a known edge case; callers should guard with `if (value)` when needed.
    expect(parseKintoneIntegerField("", "field")).toBe(0);
  });

  it("非数値文字列は SystemError をスローする", () => {
    expect(() => parseKintoneIntegerField("abc", "field")).toThrow(SystemError);
    expect(() => parseKintoneIntegerField("12abc", "field")).toThrow(
      SystemError,
    );
  });

  it("エラーメッセージにフィールド名が含まれる", () => {
    expect(() => parseKintoneIntegerField("abc", "myField")).toThrow(/myField/);
  });
});
