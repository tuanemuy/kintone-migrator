import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import { GeneralSettingsConfigParser } from "@/core/domain/generalSettings/services/configParser";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "../error";
import { parseConfigText } from "../parseConfigText";

export function parseGeneralSettingsConfigText(
  codec: ConfigCodec,
  rawText: string,
): GeneralSettingsConfig {
  const parsed = parseConfigText(codec, rawText, "General settings");
  return wrapBusinessRuleError(() => GeneralSettingsConfigParser.parse(parsed));
}
