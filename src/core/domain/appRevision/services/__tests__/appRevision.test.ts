import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { AppRevisionParser } from "../appRevisionParser";
import { AppRevisionSerializer } from "../appRevisionSerializer";

describe("AppRevision serialize/parse", () => {
  it("revision を round-trip できる", () => {
    const serialized = AppRevisionSerializer.serialize({ revision: "42" });
    expect(serialized).toEqual({ revision: "42" });

    const parsed = AppRevisionParser.parse(serialized);
    expect(parsed.revision).toBe("42");

    // serialize -> parse -> serialize is a fixed point.
    expect(AppRevisionSerializer.serialize(parsed)).toEqual(serialized);
  });

  it("revision がない場合は BusinessRuleError をスローする", () => {
    expect(() => AppRevisionParser.parse({})).toThrow(BusinessRuleError);
  });

  it("revision が空文字の場合は BusinessRuleError をスローする", () => {
    expect(() => AppRevisionParser.parse({ revision: "" })).toThrow(
      BusinessRuleError,
    );
  });

  it("revision が文字列でない場合は BusinessRuleError をスローする", () => {
    expect(() => AppRevisionParser.parse({ revision: 42 })).toThrow(
      BusinessRuleError,
    );
  });

  it("非オブジェクトは BusinessRuleError をスローする", () => {
    expect(() => AppRevisionParser.parse("not an object")).toThrow(
      BusinessRuleError,
    );
  });
});
