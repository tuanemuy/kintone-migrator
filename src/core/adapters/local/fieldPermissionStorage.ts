import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileFieldPermissionStorage
  extends LocalFileStorage
  implements FieldPermissionStorage {}
