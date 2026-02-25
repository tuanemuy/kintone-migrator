import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileAppPermissionStorage
  extends LocalFileStorage
  implements AppPermissionStorage {}
