import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import { createEmptyStorage } from "./storage";

export const emptySchemaStorage: SchemaStorage =
  createEmptyStorage("EmptySchemaStorage");
