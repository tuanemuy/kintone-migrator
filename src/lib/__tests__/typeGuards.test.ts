import { describe, expect, it } from "vitest";
import { isRecord } from "../typeGuards";

describe("isRecord", () => {
  it("プレーンオブジェクトに対してtrueを返す", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord({ a: 1, b: "two", c: true })).toBe(true);
  });

  it("nullに対してfalseを返す", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("配列に対してfalseを返す", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2])).toBe(false);
  });

  it("Dateに対してfalseを返す", () => {
    expect(isRecord(new Date())).toBe(false);
  });

  it("RegExpに対してfalseを返す", () => {
    expect(isRecord(/abc/)).toBe(false);
  });

  it("Mapに対してfalseを返す", () => {
    expect(isRecord(new Map())).toBe(false);
  });

  it("Setに対してfalseを返す", () => {
    expect(isRecord(new Set())).toBe(false);
  });

  it("プリミティブに対してfalseを返す", () => {
    expect(isRecord("string")).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(true)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord(Symbol("s"))).toBe(false);
    expect(isRecord(BigInt(1))).toBe(false);
  });

  it("Object.create(null)に対してtrueを返す", () => {
    const obj = Object.create(null);
    obj.key = "value";
    expect(isRecord(obj)).toBe(true);
  });

  it("カスタムクラスインスタンスに対してtrueを返す（既知の動作）", () => {
    class Foo {
      x = 1;
    }
    expect(isRecord(new Foo())).toBe(true);
  });

  it("Errorインスタンスに対してtrueを返す（既知の動作）", () => {
    expect(isRecord(new Error("test"))).toBe(true);
  });
});
