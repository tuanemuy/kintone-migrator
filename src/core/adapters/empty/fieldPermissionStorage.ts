import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";
import { createEmptyStorage } from "./storage";

export const emptyFieldPermissionStorage: FieldPermissionStorage =
  createEmptyStorage("EmptyFieldPermissionStorage");
