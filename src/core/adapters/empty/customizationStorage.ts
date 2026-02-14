import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";

export class EmptyCustomizationStorage implements CustomizationStorage {
  async get(): Promise<{ content: string; exists: boolean }> {
    throw new Error("EmptyCustomizationStorage.get not implemented");
  }
}
