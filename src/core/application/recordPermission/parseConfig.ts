import { isBusinessRuleError } from "@/core/domain/error";
import type { RecordPermissionConfig } from "@/core/domain/recordPermission/entity";
import { RecordPermissionConfigParser } from "@/core/domain/recordPermission/services/configParser";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseRecordPermissionConfigText(
  rawText: string,
): RecordPermissionConfig {
  try {
    return RecordPermissionConfigParser.parse(rawText);
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
