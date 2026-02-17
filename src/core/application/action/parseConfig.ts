import type { ActionsConfig } from "@/core/domain/action/entity";
import { ActionConfigParser } from "@/core/domain/action/services/configParser";
import { isBusinessRuleError } from "@/core/domain/error";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseActionConfigText(rawText: string): ActionsConfig {
  try {
    return ActionConfigParser.parse(rawText);
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
