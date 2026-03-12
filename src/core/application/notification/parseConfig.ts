import type { NotificationConfig } from "@/core/domain/notification/entity";
import { NotificationConfigParser } from "@/core/domain/notification/services/configParser";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "../error";
import { parseConfigText } from "../parseConfigText";

export function parseNotificationConfigText(
  codec: ConfigCodec,
  rawText: string,
): NotificationConfig {
  const parsed = parseConfigText(codec, rawText, "Notification");
  return wrapBusinessRuleError(() => NotificationConfigParser.parse(parsed));
}
