import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";

export class EmptyFieldPermissionStorage implements FieldPermissionStorage {
  async get(): Promise<{ content: string; exists: boolean }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyFieldPermissionStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyFieldPermissionStorage.update not implemented",
    );
  }
}
