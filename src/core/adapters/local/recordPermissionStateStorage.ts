import type { RecordPermissionStateStorage } from "@/core/domain/recordPermission/ports/recordPermissionStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileRecordPermissionStateStorage(
  filePath: string,
): RecordPermissionStateStorage {
  return createLocalFileStorage(filePath, "record permission state file");
}
