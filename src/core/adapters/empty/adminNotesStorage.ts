import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import type { StorageResult } from "@/core/domain/ports/storageResult";

export class EmptyAdminNotesStorage implements AdminNotesStorage {
  async get(): Promise<StorageResult> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyAdminNotesStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyAdminNotesStorage.update not implemented",
    );
  }
}
