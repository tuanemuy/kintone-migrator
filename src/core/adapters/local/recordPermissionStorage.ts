import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileRecordPermissionStorage(
  filePath: string,
): RecordPermissionStorage {
  return createLocalFileStorage(filePath, "record permission file");
}
