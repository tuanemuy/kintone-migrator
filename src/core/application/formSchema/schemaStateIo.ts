import type { Schema } from "@/core/domain/formSchema/entity";
import type { SchemaStateStorage } from "@/core/domain/formSchema/ports/schemaStateStorage";
import { SchemaStateParser } from "@/core/domain/formSchema/services/schemaStateParser";
import { SchemaStateSerializer } from "@/core/domain/formSchema/services/schemaStateSerializer";
import type { SchemaState } from "@/core/domain/formSchema/state";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "../error";
import { parseConfigText } from "../parseConfigText";
import { stringifyConfig } from "../stringifyConfig";

/** Loads and parses the schema state, or returns undefined when none exists. */
export async function loadState(
  storage: SchemaStateStorage,
  codec: ConfigCodec,
): Promise<SchemaState | undefined> {
  const result = await storage.get();
  if (!result.exists) {
    return undefined;
  }
  const parsed = parseConfigText(codec, result.content, "Schema state");
  return wrapBusinessRuleError(() => SchemaStateParser.parse(parsed));
}

/** Serializes and persists the schema state via the codec port. */
export async function saveState(
  storage: SchemaStateStorage,
  codec: ConfigCodec,
  revision: string,
  schema: Schema,
): Promise<void> {
  const data = SchemaStateSerializer.serialize({ revision, schema });
  const text = stringifyConfig(codec, data);
  await storage.update(text);
}
