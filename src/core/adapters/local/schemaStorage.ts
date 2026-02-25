import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileSchemaStorage
  extends LocalFileStorage
  implements SchemaStorage {}
