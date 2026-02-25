import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
import type { StorageResult } from "@/core/domain/ports/storageResult";

export class EmptyAppPermissionStorage implements AppPermissionStorage {
  async get(): Promise<StorageResult> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyAppPermissionStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyAppPermissionStorage.update not implemented",
    );
  }
}
