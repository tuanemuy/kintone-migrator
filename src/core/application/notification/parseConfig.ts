import { isBusinessRuleError } from "@/core/domain/error";
import type { NotificationConfig } from "@/core/domain/notification/entity";
import { NotificationConfigParser } from "@/core/domain/notification/services/configParser";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseNotificationConfigText(
  rawText: string,
): NotificationConfig {
  try {
    return NotificationConfigParser.parse(rawText);
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
