import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import { GeneralSettingsConfigParser } from "@/core/domain/generalSettings/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseGeneralSettingsConfigText(
  rawText: string,
): GeneralSettingsConfig {
  const parsed = parseYamlText(rawText, "General settings");
  return wrapBusinessRuleError(() => GeneralSettingsConfigParser.parse(parsed));
}
