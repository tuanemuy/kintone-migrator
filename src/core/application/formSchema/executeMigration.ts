import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import { DiffDetector } from "@/core/domain/formSchema/services/diffDetector";
import {
  collectSubtableInnerFieldCodes,
  enrichLayoutWithFields,
} from "@/core/domain/formSchema/services/layoutEnricher";
import { splitSubtableInnerFields } from "@/core/domain/formSchema/services/subtableFieldSplitter";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import type { FormSchemaServiceArgs } from "../container/formSchema";
import { assertSchemaValid } from "./assertSchemaValid";
import { parseSchemaText } from "./parseSchema";

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
  const innerFieldsToDelete: FieldCode[] = [];

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
      const { newInnerFields, existingInnerFields, deletedInnerFieldCodes } =
        splitSubtableInnerFields(after, before);

      if (newInnerFields.size > 0) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          `kintone REST API does not support adding fields to an existing subtable. Use the schema override command instead. Subtable: ${after.code}`,
        );
      }

      if (existingInnerFields.size > 0) {
        fieldsToUpdate.push({
          ...after,
          properties: { fields: existingInnerFields },
        });
      }

      for (const code of deletedInnerFieldCodes) {
        innerFieldsToDelete.push(code);
      }
    } else if (before !== undefined && before.type !== after.type) {
      throw new ValidationError(
        ValidationErrorCode.InvalidInput,
        `Field type change detected for "${after.code}" (${before.type} → ${after.type}). Use the schema override command instead.`,
      );
    } else {
      fieldsToUpdate.push(after);
    }
  }

  // Operation order: add → update → delete.
  // Unlike forceOverrideForm (delete → add → update), subtable re-creation
  // is not needed here because new inner fields on existing subtables are
  // rejected with a ValidationError above.
  if (fieldsToAdd.length > 0) {
    await container.formConfigurator.addFields(fieldsToAdd);
  }

  if (fieldsToUpdate.length > 0) {
    await container.formConfigurator.updateFields(fieldsToUpdate);
  }

  if (deleted.length > 0 || innerFieldsToDelete.length > 0) {
    const currentSubtableInnerCodes =
      collectSubtableInnerFieldCodes(currentFields);
    const fieldCodes = [
      ...deleted
        .filter((e) => !currentSubtableInnerCodes.has(e.fieldCode))
        .map((e) => e.fieldCode),
      ...innerFieldsToDelete,
    ];
    if (fieldCodes.length > 0) {
      await container.formConfigurator.deleteFields(fieldCodes);
    }
  }

  if (hasLayoutChanges) {
    await container.formConfigurator.updateLayout(schema.layout);
  }
}
