import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileAppPermissionStorage(
  filePath: string,
): AppPermissionStorage {
  return createLocalFileStorage(filePath, "app permission file");
}
