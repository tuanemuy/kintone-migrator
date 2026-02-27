import type { NotificationStorage } from "@/core/domain/notification/ports/notificationStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileNotificationStorage(
  filePath: string,
): NotificationStorage {
  return createLocalFileStorage(filePath, "notification file");
}
