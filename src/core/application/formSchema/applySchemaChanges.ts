import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import type { Schema } from "@/core/domain/formSchema/entity";
import type { ExpectedRevision } from "@/core/domain/formSchema/ports/formConfigurator";
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
import type { FormSchemaContainer } from "../container/formSchema";

function processModifiedEntry(
  after: FieldDefinition,
  before: FieldDefinition | undefined,
  fieldsToUpdate: FieldDefinition[],
  innerFieldsToDelete: FieldCode[],
): void {
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

export type ApplySchemaChangesContext = Readonly<{
  container: FormSchemaContainer;
  /**
   * Expected app (preview) revision to enforce on mutations (TOCTOU guard,
   * ADR-005 / ADR-010). Three states (see {@link ExpectedRevision}):
   * - a revision string: enforce it (push non-force).
   * - {@link SKIP_REVISION_CHECK}: skip the revision check (`--force` push /
   *   first run).
   * - omitted/`undefined`: fall back to the adapter's tracked revision
   *   (migrate, behaviour unchanged).
   */
  expectedRevision?: ExpectedRevision;
}>;

/**
 * Applies a {@link Schema} to the remote form (preview).
 *
 * This is the shared application core (ADR-009): it computes the diff against
 * the current form, classifies
 * add/update/delete/layout changes, rejects field type changes and additions
 * to existing subtables with a {@link ValidationError} (AC-13), and applies the
 * changes via the configurator. `migrate` (via local YAML) and `push` (via a
 * merged/local in-memory `Schema`) share this exact implementation.
 *
 * When `expectedRevision` is provided it is passed to every mutation so a
 * concurrent change yields a 409 conflict.
 */
export async function applySchemaChanges(
  schema: Schema,
  { container, expectedRevision }: ApplySchemaChangesContext,
): Promise<void> {
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
    processModifiedEntry(
      entry.after,
      entry.before,
      fieldsToUpdate,
      innerFieldsToDelete,
    );
  }

  // Operation order: add → update → delete.
  // Unlike forceOverrideForm (delete → add → update), subtable re-creation
  // is not needed here because new inner fields on existing subtables are
  // rejected with a ValidationError above.
  if (fieldsToAdd.length > 0) {
    await container.formConfigurator.addFields(fieldsToAdd, expectedRevision);
  }

  if (fieldsToUpdate.length > 0) {
    await container.formConfigurator.updateFields(
      fieldsToUpdate,
      expectedRevision,
    );
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
      await container.formConfigurator.deleteFields(
        fieldCodes,
        expectedRevision,
      );
    }
  }

  if (hasLayoutChanges) {
    await container.formConfigurator.updateLayout(
      schema.layout,
      expectedRevision,
    );
  }
}
