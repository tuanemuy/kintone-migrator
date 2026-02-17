import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ActionStorage } from "@/core/domain/action/ports/actionStorage";

export class EmptyActionStorage implements ActionStorage {
  async get(): Promise<{ content: string; exists: boolean }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyActionStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyActionStorage.update not implemented",
    );
  }
}
