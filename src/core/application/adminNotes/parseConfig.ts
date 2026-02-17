import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import { AdminNotesConfigParser } from "@/core/domain/adminNotes/services/configParser";
import { isBusinessRuleError } from "@/core/domain/error";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseAdminNotesConfigText(rawText: string): AdminNotesConfig {
  try {
    return AdminNotesConfigParser.parse(rawText);
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
