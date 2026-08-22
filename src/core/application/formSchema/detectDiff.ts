import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import type { FormReadTarget } from "@/core/domain/formSchema/ports/formReadTarget";
import { DEFAULT_FORM_READ_TARGET } from "@/core/domain/formSchema/ports/formReadTarget";
import { DiffDetector } from "@/core/domain/formSchema/services/diffDetector";
import { enrichLayoutWithFields } from "@/core/domain/formSchema/services/layoutEnricher";
import type {
  FieldDefinition,
  FormSchemaDiffEntry,
} from "@/core/domain/formSchema/valueObject";
import type { FormSchemaDiffServiceArgs } from "../container/formSchema";
import type { DetectDiffOutput, DiffEntryDto, SchemaFieldDto } from "./dto";
import { parseSchemaText } from "./parseSchema";

function fieldPropertiesToDto(field: FieldDefinition): Record<string, unknown> {
  if (field.type === "SUBTABLE") {
    const innerFields: Record<string, unknown> = {};
    for (const [code, def] of field.properties.fields) {
      innerFields[code] = {
        code: def.code,
        type: def.type,
        label: def.label,
        properties: def.properties,
      };
    }
    return { fields: innerFields };
  }
  return { ...field.properties };
}

function toFieldDto(field: FieldDefinition): DiffEntryDto["before"] {
  return {
    code: field.code,
    type: field.type,
    label: field.label,
    properties: fieldPropertiesToDto(field),
  };
}

export type DetectDiffInput = {
  /** Which form generation to compare against. Defaults to `"preview"`. */
  readonly target?: FormReadTarget;
};

// `input` is optional (rather than the usual required DTO object) because
// comparing against the preview is the default contract: callers that want it
// pass nothing.
export type DetectDiffArgs = FormSchemaDiffServiceArgs & {
  input?: DetectDiffInput;
};

export async function detectDiff({
  container,
  input,
}: DetectDiffArgs): Promise<DetectDiffOutput> {
  const target = input?.target ?? DEFAULT_FORM_READ_TARGET;
  const result = await container.schemaStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Schema file not found",
    );
  }
  const schema = parseSchemaText(container.configCodec, result.content);
  const [currentFields, currentLayout] = await Promise.all([
    container.formConfigurator.getFields(target),
    container.formConfigurator.getLayout(target),
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
