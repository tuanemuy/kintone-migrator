import type { AppPermissionStateStorage } from "@/core/domain/appPermission/ports/appPermissionStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileAppPermissionStateStorage(
  filePath: string,
): AppPermissionStateStorage {
  return createLocalFileStorage(filePath, "app permission state file");
}
