import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { ValidationError } from "../error";
import { parseConfigText } from "../parseConfigText";

describe("parseConfigText", () => {
  it("正常なテキストをパースする", () => {
    const result = parseConfigText(configCodec, "key: value\nnum: 42", "Test");
    expect(result).toEqual({ key: "value", num: 42 });
  });

  it("空テキストの場合、ValidationErrorをスローする", () => {
    expect(() => parseConfigText(configCodec, "", "Test")).toThrow(
      ValidationError,
    );
    expect(() => parseConfigText(configCodec, "   ", "Test")).toThrow(
      ValidationError,
    );
  });

  it("パース結果がnullの場合、ValidationErrorをスローする", () => {
    expect(() => parseConfigText(configCodec, "---\n", "Test")).toThrow(
      ValidationError,
    );
  });

  it("コメントのみの場合、ValidationErrorをスローする", () => {
    expect(() =>
      parseConfigText(configCodec, "# just a comment\n", "Test"),
    ).toThrow(ValidationError);
  });

  it("不正な構文の場合、ValidationErrorをスローする", () => {
    expect(() =>
      parseConfigText(configCodec, "{ invalid yaml:", "Test"),
    ).toThrow(ValidationError);
  });
});
