import { describe, expect, it, vi } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { PluginConfigParser } from "@/core/domain/plugin/services/configParser";
import { isValidationError } from "../../error";
import { parsePluginConfigText } from "../parseConfig";

describe("parsePluginConfigText", () => {
  it("有効なプラグイン設定をパースする", () => {
    const rawText = `
plugins:
  - id: djmhffjlbkikgmepoociabnpfcfjhdge
    name: 条件分岐プラグイン
`;
    const config = parsePluginConfigText(configCodec, rawText);
    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0].id).toBe("djmhffjlbkikgmepoociabnpfcfjhdge");
  });

  it("BusinessRuleErrorをValidationErrorに変換する", () => {
    try {
      parsePluginConfigText(configCodec, "");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合にValidationErrorをスローする", () => {
    try {
      parsePluginConfigText(configCodec, "{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正な構造のYAMLの場合にValidationErrorをスローする", () => {
    try {
      parsePluginConfigText(configCodec, "plugins: not_array");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("BusinessRuleError以外のエラーはそのまま再スローされる", () => {
    vi.spyOn(PluginConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parsePluginConfigText(configCodec, "dummy")).toThrow(
      TypeError,
    );
    vi.restoreAllMocks();
  });
});
