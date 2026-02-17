import { isBusinessRuleError } from "@/core/domain/error";
import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import { GeneralSettingsConfigParser } from "@/core/domain/generalSettings/services/configParser";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseGeneralSettingsConfigText(
  rawText: string,
): GeneralSettingsConfig {
  try {
    return GeneralSettingsConfigParser.parse(rawText);
  } catch (error) {
    if (isBusinessRuleError(error)) {
      throw new ValidationError(
        ValidationErrorCode.InvalidInput,
        error.message,
        error,
      );
    }
    throw error;
  }
}
