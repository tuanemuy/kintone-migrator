import type { AppPermissionConfig } from "@/core/domain/appPermission/entity";
import { AppPermissionConfigParser } from "@/core/domain/appPermission/services/configParser";
import { isBusinessRuleError } from "@/core/domain/error";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseAppPermissionConfigText(
  rawText: string,
): AppPermissionConfig {
  try {
    return AppPermissionConfigParser.parse(rawText);
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
