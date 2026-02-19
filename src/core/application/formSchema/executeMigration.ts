import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import { DiffDetector } from "@/core/domain/formSchema/services/diffDetector";
import {
  collectSubtableInnerFieldCodes,
  enrichLayoutWithFields,
} from "@/core/domain/formSchema/services/layoutEnricher";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import type { Container } from "../container";
import type { ServiceArgs } from "../types";
import { assertSchemaValid } from "./assertSchemaValid";
import { parseSchemaText } from "./parseSchema";

export async function executeMigration({
  container,
}: ServiceArgs<Container>): Promise<void> {
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

  const fieldsToAdd: FieldDefinition[] = [];
  const fieldsToUpdate: FieldDefinition[] = [];

  for (const entry of added) {
    if (entry.after === undefined) continue;
    if (subtableInnerCodes.has(entry.fieldCode)) continue;
    fieldsToAdd.push(entry.after);
  }

  for (const entry of modified) {
    if (entry.after === undefined) continue;
    if (subtableInnerCodes.has(entry.fieldCode)) continue;
    const after = entry.after;
    const before = entry.before;

    if (
      after.type === "SUBTABLE" &&
      before !== undefined &&
      before.type === "SUBTABLE"
    ) {
      const newInnerFields = new Map<FieldCode, FieldDefinition>();
      const existingInnerFields = new Map<FieldCode, FieldDefinition>();

      for (const [code, def] of after.properties.fields) {
        if (before.properties.fields.has(code)) {
          existingInnerFields.set(code, def);
        } else {
          newInnerFields.set(code, def);
        }
      }

      if (newInnerFields.size > 0) {
        fieldsToAdd.push({
          ...after,
          properties: { fields: newInnerFields },
        });
      }

      if (existingInnerFields.size > 0) {
        fieldsToUpdate.push({
          ...after,
          properties: { fields: existingInnerFields },
        });
      }
    } else {
      fieldsToUpdate.push(after);
    }
  }

  if (fieldsToAdd.length > 0) {
    await container.formConfigurator.addFields(fieldsToAdd);
  }

  if (fieldsToUpdate.length > 0) {
    await container.formConfigurator.updateFields(fieldsToUpdate);
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
