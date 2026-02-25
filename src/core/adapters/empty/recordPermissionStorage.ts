import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";

export class EmptyRecordPermissionStorage implements RecordPermissionStorage {
  async get(): Promise<StorageResult> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordPermissionStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordPermissionStorage.update not implemented",
    );
  }
}
