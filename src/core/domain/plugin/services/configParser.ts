import { BusinessRuleError } from "@/core/domain/error";
import { validateParsedConfig } from "@/core/domain/services/configValidator";
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

  if (typeof raw.id !== "string" || raw.id.length === 0) {
    throw new BusinessRuleError(
      PluginErrorCode.PlEmptyPluginId,
      `Plugin at index ${index} must have a non-empty "id" property`,
    );
  }

  if (
    raw.enabled !== undefined &&
    raw.enabled !== null &&
    typeof raw.enabled !== "boolean"
  ) {
    throw new BusinessRuleError(
      PluginErrorCode.PlInvalidConfigStructure,
      `Plugin at index ${index} has invalid "enabled": must be a boolean`,
    );
  }

  return {
    id: raw.id,
    name: typeof raw.name === "string" ? raw.name : "",
    // Defaults to true when not specified — matches kintone's default behavior
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
  };
}

export const PluginConfigParser = {
  parse: (parsed: unknown): PluginsConfig => {
    const obj = validateParsedConfig(
      parsed,
      PluginErrorCode.PlInvalidConfigStructure,
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

    // Detect duplicate plugin IDs to prevent silent overwrites
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
