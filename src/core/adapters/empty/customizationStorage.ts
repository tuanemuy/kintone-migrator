import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";

export class EmptyCustomizationStorage implements CustomizationStorage {
  async get(): Promise<{ content: string; exists: boolean }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyCustomizationStorage.get not implemented",
    );
  }
}
