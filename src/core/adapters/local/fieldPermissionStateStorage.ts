import type { FieldPermissionStateStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileFieldPermissionStateStorage(
  filePath: string,
): FieldPermissionStateStorage {
  return createLocalFileStorage(filePath, "field permission state file");
}
