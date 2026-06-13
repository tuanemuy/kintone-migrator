import type { CustomizationStateStorage } from "@/core/domain/customization/ports/customizationStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileCustomizationStateStorage(
  filePath: string,
): CustomizationStateStorage {
  return createLocalFileStorage(filePath, "customization state file");
}
