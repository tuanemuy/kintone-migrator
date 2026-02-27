import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileSchemaStorage(filePath: string): SchemaStorage {
  return createLocalFileStorage(filePath, "schema file");
}
