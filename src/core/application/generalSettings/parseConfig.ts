import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import { GeneralSettingsConfigParser } from "@/core/domain/generalSettings/services/configParser";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseGeneralSettingsConfigText(
  codec: ConfigCodec,
  rawText: string,
): GeneralSettingsConfig {
  const parsed = parseYamlText(codec, rawText, "General settings");
  return wrapBusinessRuleError(() => GeneralSettingsConfigParser.parse(parsed));
}
