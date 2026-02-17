import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import type { PluginConfig, PluginsConfig } from "../entity";
import { PluginErrorCode } from "../errorCode";

function parsePluginEntry(raw: unknown, index: number): PluginConfig {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      PluginErrorCode.PlInvalidConfigStructure,
      `Plugin at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== "string" || obj.id.length === 0) {
    throw new BusinessRuleError(
      PluginErrorCode.PlEmptyPluginId,
      `Plugin at index ${index} must have a non-empty "id" property`,
    );
  }

  return {
    id: obj.id,
    name: typeof obj.name === "string" ? obj.name : "",
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : true,
  };
}

export const PluginConfigParser = {
  parse: (rawText: string): PluginsConfig => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        PluginErrorCode.PlEmptyConfigText,
        "Plugin config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        PluginErrorCode.PlInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new BusinessRuleError(
        PluginErrorCode.PlInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed as Record<string, unknown>;

    if (!Array.isArray(obj.plugins)) {
      throw new BusinessRuleError(
        PluginErrorCode.PlInvalidConfigStructure,
        'Config must have a "plugins" array',
      );
    }

    const plugins = obj.plugins.map((item: unknown, i: number) =>
      parsePluginEntry(item, i),
    );

    return { plugins };
  },
};
