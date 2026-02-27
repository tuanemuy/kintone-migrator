import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { StorageResult } from "@/core/domain/ports/storageResult";

export function createEmptyStorage(name: string): {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
} {
  return {
    async get(): Promise<StorageResult> {
      throw new SystemError(
        SystemErrorCode.InternalServerError,
        `${name}.get not implemented`,
      );
    },
    async update(_content: string): Promise<void> {
      throw new SystemError(
        SystemErrorCode.InternalServerError,
        `${name}.update not implemented`,
      );
    },
  };
}
