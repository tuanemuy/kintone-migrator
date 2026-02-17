import { isBusinessRuleError } from "@/core/domain/error";
import type { ViewsConfig } from "@/core/domain/view/entity";
import { ViewConfigParser } from "@/core/domain/view/services/configParser";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseViewConfigText(rawText: string): ViewsConfig {
  try {
    return ViewConfigParser.parse(rawText);
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
