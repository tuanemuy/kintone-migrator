import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import { DiffDetector } from "@/core/domain/formSchema/services/diffDetector";
import { enrichLayoutWithFields } from "@/core/domain/formSchema/services/layoutEnricher";
import type {
  FieldDefinition,
  FormSchemaDiffEntry,
} from "@/core/domain/formSchema/valueObject";
import type { FormSchemaDiffServiceArgs } from "../container/formSchema";
import type { DetectDiffOutput, DiffEntryDto, SchemaFieldDto } from "./dto";
import { parseSchemaText } from "./parseSchema";

function toFieldDto(field: FieldDefinition): DiffEntryDto["before"] {
  return {
    code: field.code,
    type: field.type,
    label: field.label,
    properties: field.properties as Record<string, unknown>,
  };
}

export async function detectDiff({
  container,
}: FormSchemaDiffServiceArgs): Promise<DetectDiffOutput> {
  const result = await container.schemaStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Schema file not found",
    );
  }
  const schema = parseSchemaText(result.content);
  const [currentFields, currentLayout] = await Promise.all([
    container.formConfigurator.getFields(),
    container.formConfigurator.getLayout(),
  ]);
  const diff = DiffDetector.detect(schema, currentFields);
  const enrichedCurrentLayout = enrichLayoutWithFields(
    currentLayout,
    currentFields,
  );
  const hasLayoutChanges = DiffDetector.detectLayoutChanges(
    schema.layout,
    enrichedCurrentLayout,
  );

  const entries: DiffEntryDto[] = diff.entries.map(
    (entry: FormSchemaDiffEntry) => ({
      type: entry.type,
      fieldCode: entry.fieldCode,
      fieldLabel: entry.fieldLabel,
      details: entry.details,
      ...(entry.before ? { before: toFieldDto(entry.before) } : {}),
      ...(entry.after ? { after: toFieldDto(entry.after) } : {}),
    }),
  );

  const schemaFields: SchemaFieldDto[] = Array.from(
    schema.fields.entries(),
  ).map(([code, def]) => ({
    fieldCode: code,
    fieldLabel: def.label,
    fieldType: def.type,
  }));

  return {
    entries,
    schemaFields,
    summary: diff.summary,
    isEmpty: diff.isEmpty && !hasLayoutChanges,
    hasLayoutChanges,
  };
}
