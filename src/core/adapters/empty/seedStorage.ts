import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";

export class EmptySeedStorage implements SeedStorage {
  async get(): Promise<StorageResult> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptySeedStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptySeedStorage.update not implemented",
    );
  }
}
