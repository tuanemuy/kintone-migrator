import type { NotificationStorage } from "@/core/domain/notification/ports/notificationStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileNotificationStorage
  extends LocalFileStorage
  implements NotificationStorage {}
