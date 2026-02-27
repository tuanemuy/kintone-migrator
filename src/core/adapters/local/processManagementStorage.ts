import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileProcessManagementStorage(
  filePath: string,
): ProcessManagementStorage {
  return createLocalFileStorage(filePath, "process management file");
}
