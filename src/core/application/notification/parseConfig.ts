import type { NotificationConfig } from "@/core/domain/notification/entity";
import { NotificationConfigParser } from "@/core/domain/notification/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseNotificationConfigText(
  rawText: string,
): NotificationConfig {
  return wrapBusinessRuleError(() => NotificationConfigParser.parse(rawText));
}
