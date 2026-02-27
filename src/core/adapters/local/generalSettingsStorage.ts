import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileGeneralSettingsStorage(
  filePath: string,
): GeneralSettingsStorage {
  return createLocalFileStorage(filePath, "general settings file");
}
