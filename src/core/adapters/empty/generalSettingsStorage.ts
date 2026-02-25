import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import type { StorageResult } from "@/core/domain/ports/storageResult";

export class EmptyGeneralSettingsStorage implements GeneralSettingsStorage {
  async get(): Promise<StorageResult> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyGeneralSettingsStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyGeneralSettingsStorage.update not implemented",
    );
  }
}
