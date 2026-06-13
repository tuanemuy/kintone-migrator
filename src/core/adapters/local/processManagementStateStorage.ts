import type { ProcessManagementStateStorage } from "@/core/domain/processManagement/ports/processManagementStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileProcessManagementStateStorage(
  filePath: string,
): ProcessManagementStateStorage {
  return createLocalFileStorage(filePath, "process management state file");
}
