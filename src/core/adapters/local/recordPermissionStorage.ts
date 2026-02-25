import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileRecordPermissionStorage
  extends LocalFileStorage
  implements RecordPermissionStorage {}
