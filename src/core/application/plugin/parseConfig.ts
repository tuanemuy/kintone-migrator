import type { PluginsConfig } from "@/core/domain/plugin/entity";
import { PluginConfigParser } from "@/core/domain/plugin/services/configParser";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "../error";
import { parseConfigText } from "../parseConfigText";

export function parsePluginConfigText(
  codec: ConfigCodec,
  rawText: string,
): PluginsConfig {
  const parsed = parseConfigText(codec, rawText, "Plugin");
  return wrapBusinessRuleError(() => PluginConfigParser.parse(parsed));
}
