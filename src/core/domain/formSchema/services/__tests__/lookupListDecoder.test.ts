import { describe, expect, it } from "vitest";
import { decodeLookupList } from "../lookupListDecoder";

describe("decodeLookupList", () => {
  it("未設定を表す空文字は空配列にする", () => {
    expect(decodeLookupList("")).toStrictEqual([]);
  });

  it("配列はそのまま返す", () => {
    const list = ["name"];

    expect(decodeLookupList(list)).toBe(list);
  });

  it.each([
    ["空でない文字列", "name"],
    ["オブジェクト", { field: "name" }],
    ["undefined", undefined],
    ["null", null],
  ])("%sはリストでないので undefined を返す", (_, value) => {
    expect(decodeLookupList(value)).toBeUndefined();
  });
});
