import { isBusinessRuleError } from "@/core/domain/error";
import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import { ProcessManagementConfigParser } from "@/core/domain/processManagement/services/configParser";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseProcessManagementConfigText(
  rawText: string,
): ProcessManagementConfig {
  try {
    return ProcessManagementConfigParser.parse(rawText);
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
