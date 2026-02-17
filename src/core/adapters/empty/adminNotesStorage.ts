import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";

export class EmptyAdminNotesStorage implements AdminNotesStorage {
  async get(): Promise<{ content: string; exists: boolean }> {
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
