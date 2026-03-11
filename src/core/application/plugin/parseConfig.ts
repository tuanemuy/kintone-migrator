import type { PluginsConfig } from "@/core/domain/plugin/entity";
import { PluginConfigParser } from "@/core/domain/plugin/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parsePluginConfigText(rawText: string): PluginsConfig {
  const parsed = parseYamlText(rawText, "Plugin");
  return wrapBusinessRuleError(() => PluginConfigParser.parse(parsed));
}
