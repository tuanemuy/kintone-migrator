import type { NotificationStorage } from "@/core/domain/notification/ports/notificationStorage";
import { createEmptyStorage } from "./storage";

export const emptyNotificationStorage: NotificationStorage = createEmptyStorage(
  "EmptyNotificationStorage",
);
