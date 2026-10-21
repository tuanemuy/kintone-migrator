import { describe, expect, it } from "vitest";
import { readLookupList } from "../lookupListReader";

describe("readLookupList", () => {
  it("未設定を表す空文字は空配列にする", () => {
    expect(readLookupList("")).toStrictEqual([]);
  });

  it("配列はそのまま返す", () => {
    const list = ["name"];

    expect(readLookupList(list)).toBe(list);
  });

  it.each([
    ["空でない文字列", "name"],
    ["オブジェクト", { field: "name" }],
    ["undefined", undefined],
    ["null", null],
  ])("%sはリストでないので undefined を返す", (_, value) => {
    expect(readLookupList(value)).toBeUndefined();
  });
});
