import type { SchemaStateStorage } from "@/core/domain/formSchema/ports/schemaStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileSchemaStateStorage(
  filePath: string,
): SchemaStateStorage {
  return createLocalFileStorage(filePath, "schema state file");
}
