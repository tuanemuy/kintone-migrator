import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileFieldPermissionStorage(
  filePath: string,
): FieldPermissionStorage {
  return createLocalFileStorage(filePath, "field permission file");
}
