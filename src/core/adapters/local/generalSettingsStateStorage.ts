import type { GeneralSettingsStateStorage } from "@/core/domain/generalSettings/ports/generalSettingsStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileGeneralSettingsStateStorage(
  filePath: string,
): GeneralSettingsStateStorage {
  return createLocalFileStorage(filePath, "general settings state file");
}
