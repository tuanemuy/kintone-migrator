import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";
import { createEmptyStorage } from "./storage";

export const emptyRecordPermissionStorage: RecordPermissionStorage =
  createEmptyStorage("EmptyRecordPermissionStorage");
