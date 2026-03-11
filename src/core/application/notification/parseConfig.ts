import type { NotificationConfig } from "@/core/domain/notification/entity";
import { NotificationConfigParser } from "@/core/domain/notification/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseNotificationConfigText(
  rawText: string,
): NotificationConfig {
  const parsed = parseYamlText(rawText, "Notification");
  return wrapBusinessRuleError(() => NotificationConfigParser.parse(parsed));
}
