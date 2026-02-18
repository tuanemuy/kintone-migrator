import type { Schema } from "@/core/domain/formSchema/entity";
import { SchemaParser } from "@/core/domain/formSchema/services/schemaParser";
import { wrapBusinessRuleError } from "../error";

export function parseSchemaText(rawText: string): Schema {
  return wrapBusinessRuleError(() => SchemaParser.parse(rawText));
}
