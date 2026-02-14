import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";

export class EmptySchemaStorage implements SchemaStorage {
  async get(): Promise<{ content: string; exists: boolean }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptySchemaStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptySchemaStorage.update not implemented",
    );
  }
}
