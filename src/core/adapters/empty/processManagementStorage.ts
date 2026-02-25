import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";

export class EmptyProcessManagementStorage implements ProcessManagementStorage {
  async get(): Promise<StorageResult> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyProcessManagementStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyProcessManagementStorage.update not implemented",
    );
  }
}
