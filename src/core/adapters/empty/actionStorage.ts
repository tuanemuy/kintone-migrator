import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ActionStorage } from "@/core/domain/action/ports/actionStorage";
import type { StorageResult } from "@/core/domain/ports/storageResult";

export class EmptyActionStorage implements ActionStorage {
  async get(): Promise<StorageResult> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyActionStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyActionStorage.update not implemented",
    );
  }
}
