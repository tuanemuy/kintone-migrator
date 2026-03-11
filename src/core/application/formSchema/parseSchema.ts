import type { Schema } from "@/core/domain/formSchema/entity";
import { SchemaParser } from "@/core/domain/formSchema/services/schemaParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseSchemaText(rawText: string): Schema {
  const parsed = parseYamlText(rawText, "Schema");
  return wrapBusinessRuleError(() => SchemaParser.parse(parsed));
}
