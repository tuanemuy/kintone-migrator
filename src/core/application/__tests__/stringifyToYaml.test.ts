import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { isSystemError } from "../error";
import { stringifyToYaml } from "../stringifyToYaml";

describe("stringifyToYaml", () => {
  it("正常なデータをYAML文字列にシリアライズする", () => {
    const result = stringifyToYaml(configCodec, { key: "value", num: 42 });
    expect(result).toContain("key: value");
    expect(result).toContain("num: 42");
  });

  it("codec.stringify がエラーを投げた場合、SystemErrorをスローする", () => {
    const failingCodec: ConfigCodec = {
      parse: () => ({}),
      stringify: () => {
        throw new Error("stringify failed");
      },
    };

    try {
      stringifyToYaml(failingCodec, { key: "value" });
      expect.fail("Expected error");
    } catch (error) {
      expect(isSystemError(error)).toBe(true);
      if (isSystemError(error)) {
        expect(error.message).toContain(
          "Failed to serialize config to YAML: stringify failed",
        );
      }
    }
  });
});
