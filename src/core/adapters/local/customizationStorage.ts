import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileCustomizationStorage(
  filePath: string,
): CustomizationStorage {
  return createLocalFileStorage(filePath, "customization config file");
}
