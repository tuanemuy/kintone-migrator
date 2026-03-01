import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import { isRecord } from "@/core/domain/typeGuards";
import type { PluginConfig, PluginsConfig } from "../entity";
import { PluginErrorCode } from "../errorCode";

function parsePluginEntry(raw: unknown, index: number): PluginConfig {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      PluginErrorCode.PlInvalidConfigStructure,
      `Plugin at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.id !== "string" || obj.id.length === 0) {
    throw new BusinessRuleError(
      PluginErrorCode.PlEmptyPluginId,
      `Plugin at index ${index} must have a non-empty "id" property`,
    );
  }

  return {
    id: obj.id,
    name: typeof obj.name === "string" ? obj.name : "",
    // Defaults to true when not specified — matches kintone's default behavior
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : true,
  };
}

export const PluginConfigParser = {
  parse: (rawText: string): PluginsConfig => {
    const obj = parseYamlConfig(
      rawText,
      {
        emptyConfigText: PluginErrorCode.PlEmptyConfigText,
        invalidConfigYaml: PluginErrorCode.PlInvalidConfigYaml,
        invalidConfigStructure: PluginErrorCode.PlInvalidConfigStructure,
      },
      "Plugin",
    );

    if (!Array.isArray(obj.plugins)) {
      throw new BusinessRuleError(
        PluginErrorCode.PlInvalidConfigStructure,
        'Config must have a "plugins" array',
      );
    }

    const plugins = obj.plugins.map((item: unknown, i: number) =>
      parsePluginEntry(item, i),
    );

    // Issue 7.1: Validate no duplicate plugin IDs
    const seenIds = new Set<string>();
    for (const plugin of plugins) {
      if (seenIds.has(plugin.id)) {
        throw new BusinessRuleError(
          PluginErrorCode.PlDuplicatePluginId,
          `Duplicate plugin ID: "${plugin.id}"`,
        );
      }
      seenIds.add(plugin.id);
    }

    return { plugins };
  },
};
