import { describe, expect, it } from "vitest";
import { isNodeError } from "../nodeError";

describe("isNodeError", () => {
  it("codeプロパティを持つErrorに対してtrueを返す", () => {
    const error = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    expect(isNodeError(error)).toBe(true);
  });

  it("NodeJS.ErrnoExceptionに対してtrueを返す", () => {
    const error: NodeJS.ErrnoException = new Error("file not found");
    error.code = "ENOENT";
    error.errno = -2;
    error.syscall = "open";
    expect(isNodeError(error)).toBe(true);
  });

  it("codeプロパティがないErrorに対してfalseを返す", () => {
    expect(isNodeError(new Error("plain error"))).toBe(false);
  });

  it("文字列に対してfalseを返す", () => {
    expect(isNodeError("not an error")).toBe(false);
  });

  it("nullに対してfalseを返す", () => {
    expect(isNodeError(null)).toBe(false);
  });

  it("undefinedに対してfalseを返す", () => {
    expect(isNodeError(undefined)).toBe(false);
  });

  it("codeプロパティを持つプレーンオブジェクトに対してfalseを返す", () => {
    expect(isNodeError({ code: "ENOENT", message: "not found" })).toBe(false);
  });
});
