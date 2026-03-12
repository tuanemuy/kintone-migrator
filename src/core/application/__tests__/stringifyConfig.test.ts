import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { SystemError } from "../error";
import { stringifyConfig } from "../stringifyConfig";

describe("stringifyConfig", () => {
  it("正常なデータを文字列にシリアライズする", () => {
    const result = stringifyConfig(configCodec, { key: "value", num: 42 });
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

    expect(() => stringifyConfig(failingCodec, { key: "value" })).toThrow(
      SystemError,
    );
  });
});
