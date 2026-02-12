import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";

export class EmptySchemaStorage implements SchemaStorage {
  async get(): Promise<string> {
    throw new Error("EmptySchemaStorage.get not implemented");
  }

  async update(_content: string): Promise<void> {
    throw new Error("EmptySchemaStorage.update not implemented");
  }
}
