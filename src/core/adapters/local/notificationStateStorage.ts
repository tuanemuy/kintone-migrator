import type { NotificationStateStorage } from "@/core/domain/notification/ports/notificationStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileNotificationStateStorage(
  filePath: string,
): NotificationStateStorage {
  return createLocalFileStorage(filePath, "notification state file");
}
