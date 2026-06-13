import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import type { FormSchemaServiceArgs } from "../container/formSchema";
import { applySchemaChanges } from "./applySchemaChanges";
import { assertSchemaValid } from "./assertSchemaValid";
import { parseSchemaText } from "./parseSchema";

/**
 * Reads the local schema YAML and applies it to the remote form.
 *
 * Thin wrapper around {@link applySchemaChanges} (ADR-009): it loads/parses the
 * local schema file and validates it, then delegates the application core to
 * the shared function. It does not enforce an expected revision (legacy migrate
 * behaviour) and does not read or write the state file.
 */
export async function executeMigration({
  container,
}: FormSchemaServiceArgs): Promise<void> {
  const result = await container.schemaStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Schema file not found",
    );
  }
  const schema = parseSchemaText(container.configCodec, result.content);

  assertSchemaValid(schema);

  await applySchemaChanges(schema, { container });
}
