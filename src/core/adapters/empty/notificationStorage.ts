import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { NotificationStorage } from "@/core/domain/notification/ports/notificationStorage";
import type { StorageResult } from "@/core/domain/ports/storageResult";

export class EmptyNotificationStorage implements NotificationStorage {
  async get(): Promise<StorageResult> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyNotificationStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyNotificationStorage.update not implemented",
    );
  }
}
