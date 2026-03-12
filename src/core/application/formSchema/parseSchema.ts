import type { Schema } from "@/core/domain/formSchema/entity";
import { SchemaParser } from "@/core/domain/formSchema/services/schemaParser";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "../error";
import { parseConfigText } from "../parseConfigText";

export function parseSchemaText(codec: ConfigCodec, rawText: string): Schema {
  const parsed = parseConfigText(codec, rawText, "Schema");
  return wrapBusinessRuleError(() => SchemaParser.parse(parsed));
}
