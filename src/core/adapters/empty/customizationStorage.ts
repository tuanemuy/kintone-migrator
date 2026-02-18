import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import type { StorageResult } from "@/core/domain/ports/storageResult";

export class EmptyCustomizationStorage implements CustomizationStorage {
  async get(): Promise<StorageResult> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyCustomizationStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyCustomizationStorage.update not implemented",
    );
  }
}
