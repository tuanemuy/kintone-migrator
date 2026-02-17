import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ViewStorage } from "@/core/domain/view/ports/viewStorage";

export class EmptyViewStorage implements ViewStorage {
  async get(): Promise<{ content: string; exists: boolean }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyViewStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyViewStorage.update not implemented",
    );
  }
}
