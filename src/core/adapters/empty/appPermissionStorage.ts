import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
import { createEmptyStorage } from "./storage";

export const emptyAppPermissionStorage: AppPermissionStorage =
  createEmptyStorage("EmptyAppPermissionStorage");
