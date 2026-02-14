import { isBusinessRuleError } from "@/core/domain/error";
import type { FieldPermissionConfig } from "@/core/domain/fieldPermission/entity";
import { FieldPermissionConfigParser } from "@/core/domain/fieldPermission/services/configParser";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseFieldPermissionConfigText(
  rawText: string,
): FieldPermissionConfig {
  try {
    return FieldPermissionConfigParser.parse(rawText);
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
