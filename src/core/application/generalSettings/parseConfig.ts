import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import { GeneralSettingsConfigParser } from "@/core/domain/generalSettings/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseGeneralSettingsConfigText(
  rawText: string,
): GeneralSettingsConfig {
  return wrapBusinessRuleError(() =>
    GeneralSettingsConfigParser.parse(rawText),
  );
}
