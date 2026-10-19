import { NotificationDiffDetector } from "@/core/domain/notification/services/diffDetector";
import type { NotificationDiff } from "@/core/domain/notification/valueObject";
import type { NotificationDiffServiceArgs } from "../container/notification";
import { ValidationError, ValidationErrorCode } from "../error";
import { loadNotificationRemote } from "./loadNotificationRemote";
import { parseNotificationConfigText } from "./parseConfig";

export type { NotificationDiffEntry } from "@/core/domain/notification/valueObject";

export async function detectNotificationDiff({
  container,
}: NotificationDiffServiceArgs): Promise<NotificationDiff> {
  const [storageResult, remote] = await Promise.all([
    container.notificationStorage.get(),
    loadNotificationRemote(container),
  ]);

  if (!storageResult.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Notification config file not found",
    );
  }
  const localConfig = parseNotificationConfigText(
    container.configCodec,
    storageResult.content,
  );

  return NotificationDiffDetector.detect(localConfig, remote.config);
}
