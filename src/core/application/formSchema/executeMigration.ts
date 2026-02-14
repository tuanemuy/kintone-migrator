import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import {
  collectSubtableInnerFieldCodes,
  enrichLayoutWithFields,
} from "@/core/domain/formSchema/entity";
import { DiffDetector } from "@/core/domain/formSchema/services/diffDetector";
import type { FieldDefinition } from "@/core/domain/formSchema/valueObject";
import type { ServiceArgs } from "../types";
import { assertSchemaValid } from "./assertSchemaValid";
import { parseSchemaText } from "./parseSchema";

export async function executeMigration({
  container,
}: ServiceArgs): Promise<void> {
  const result = await container.schemaStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Schema file not found",
    );
  }
  const schema = parseSchemaText(result.content);

  assertSchemaValid(schema);

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

  if (diff.isEmpty && !hasLayoutChanges) {
    return;
  }

  const subtableInnerCodes = collectSubtableInnerFieldCodes(schema.fields);

  const added = diff.entries.filter((e) => e.type === "added");
  const modified = diff.entries.filter((e) => e.type === "modified");
  const deleted = diff.entries.filter((e) => e.type === "deleted");

  if (added.length > 0) {
    const fields = added
      .filter(
        (e): e is typeof e & { after: FieldDefinition } =>
          e.after !== undefined,
      )
      .filter((e) => !subtableInnerCodes.has(e.fieldCode))
      .map((e) => e.after);
    if (fields.length > 0) {
      await container.formConfigurator.addFields(fields);
    }
  }

  if (modified.length > 0) {
    const fields = modified
      .filter(
        (e): e is typeof e & { after: FieldDefinition } =>
          e.after !== undefined,
      )
      .filter((e) => !subtableInnerCodes.has(e.fieldCode))
      .map((e) => e.after);
    if (fields.length > 0) {
      await container.formConfigurator.updateFields(fields);
    }
  }

  if (deleted.length > 0) {
    const currentSubtableInnerCodes =
      collectSubtableInnerFieldCodes(currentFields);
    const fieldCodes = deleted
      .filter((e) => !currentSubtableInnerCodes.has(e.fieldCode))
      .map((e) => e.fieldCode);
    if (fieldCodes.length > 0) {
      await container.formConfigurator.deleteFields(fieldCodes);
    }
  }

  if (hasLayoutChanges) {
    await container.formConfigurator.updateLayout(schema.layout);
  }
}
