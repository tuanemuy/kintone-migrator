import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import type { ProjectConfigStorage } from "@/core/domain/projectConfig/ports/projectConfigStorage";

export class EmptyProjectConfigStorage implements ProjectConfigStorage {
  async get(): Promise<StorageResult> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyProjectConfigStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyProjectConfigStorage.update not implemented",
    );
  }
}
