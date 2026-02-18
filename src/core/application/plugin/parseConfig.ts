import type { PluginsConfig } from "@/core/domain/plugin/entity";
import { PluginConfigParser } from "@/core/domain/plugin/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parsePluginConfigText(rawText: string): PluginsConfig {
  return wrapBusinessRuleError(() => PluginConfigParser.parse(rawText));
}
