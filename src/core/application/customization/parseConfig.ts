import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { ConfigParser } from "@/core/domain/customization/services/configParser";
import { isBusinessRuleError } from "@/core/domain/error";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseConfigText(rawText: string): CustomizationConfig {
  try {
    return ConfigParser.parse(rawText);
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
