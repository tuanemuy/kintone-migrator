import type { Schema } from "@/core/domain/formSchema/entity";
import { enrichLayoutWithFields } from "@/core/domain/formSchema/services/layoutEnricher";
import { projectRemoteFields } from "@/core/domain/formSchema/services/relatedAppProjection";
import { SchemaSerializer } from "@/core/domain/formSchema/services/schemaSerializer";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import type { FormSchemaServiceArgs } from "../container/formSchema";
import { isValidationError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import type { CaptureSchemaOutput } from "./dto";
import { parseSchemaText } from "./parseSchema";

/**
 * The existing schema file, which decides how the captured related apps are
 * referred to; `undefined` when there is none or it cannot be parsed.
 */
function readReferenceSchema(
  container: FormSchemaServiceArgs["container"],
  existing: StorageResult,
): Schema | undefined {
  if (!existing.exists) return undefined;
  // try-catch is intentional: capture is how an unparsable schema file gets
  // rewritten, so such a file falls back to referring by app ID instead of
  // failing the capture.
  try {
    return parseSchemaText(container.configCodec, existing.content);
  } catch (error) {
    if (isValidationError(error)) return undefined;
    throw error;
  }
}

export async function captureSchema({
  container,
}: FormSchemaServiceArgs): Promise<CaptureSchemaOutput> {
  const [remoteFields, currentLayout, existingResult] = await Promise.all([
    container.formConfigurator.getFields(),
    container.formConfigurator.getLayout(),
    container.schemaStorage.get(),
  ]);
  const currentFields = projectRemoteFields(
    remoteFields,
    readReferenceSchema(container, existingResult)?.fields,
  );
  const enrichedLayout = enrichLayoutWithFields(currentLayout, currentFields);
  const schemaText = stringifyConfig(
    container.configCodec,
    SchemaSerializer.serialize(enrichedLayout, currentFields),
  );

  return {
    schemaText,
    hasExistingSchema: existingResult.exists,
  };
}
