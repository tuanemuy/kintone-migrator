import { describe, expect, it } from "vitest";
import { AnyError, isError } from "../error";

describe("AnyError", () => {
  it("メッセージを保持する", () => {
    const error = new AnyError("test message");
    expect(error.message).toBe("test message");
  });

  it("causeを保持する", () => {
    const cause = new Error("original error");
    const error = new AnyError("wrapper", cause);
    expect(error.cause).toBe(cause);
  });

  it("causeなしで作成できる", () => {
    const error = new AnyError("no cause");
    expect(error.cause).toBeUndefined();
  });

  it("Errorのインスタンスである", () => {
    const error = new AnyError("test");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("isError", () => {
  it("Errorインスタンスに対してtrueを返す", () => {
    expect(isError(new Error("test"))).toBe(true);
  });

  it("AnyErrorインスタンスに対してtrueを返す", () => {
    expect(isError(new AnyError("test"))).toBe(true);
  });

  it("文字列に対してfalseを返す", () => {
    expect(isError("not an error")).toBe(false);
  });

  it("nullに対してfalseを返す", () => {
    expect(isError(null)).toBe(false);
  });

  it("undefinedに対してfalseを返す", () => {
    expect(isError(undefined)).toBe(false);
  });

  it("数値に対してfalseを返す", () => {
    expect(isError(42)).toBe(false);
  });

  it("オブジェクトに対してfalseを返す", () => {
    expect(isError({ message: "not an error" })).toBe(false);
  });
});
