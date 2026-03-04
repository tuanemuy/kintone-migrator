import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import { collectSubtableInnerFieldCodes } from "@/core/domain/formSchema/services/layoutEnricher";
import { splitSubtableInnerFields } from "@/core/domain/formSchema/services/subtableFieldSplitter";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import type { FormSchemaServiceArgs } from "../container/formSchema";
import { assertSchemaValid } from "./assertSchemaValid";
import { parseSchemaText } from "./parseSchema";

export async function forceOverrideForm({
  container,
}: FormSchemaServiceArgs): Promise<void> {
  const result = await container.schemaStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Schema file not found",
    );
  }
  const schema = parseSchemaText(result.content);

  assertSchemaValid(schema);

  const currentFields = await container.formConfigurator.getFields();
  const subtableInnerCodes = collectSubtableInnerFieldCodes(schema.fields);

  const toAdd: FieldDefinition[] = [];
  const toUpdate: FieldDefinition[] = [];
  const toDelete: FieldCode[] = [];
  const innerFieldsToDelete: FieldCode[] = [];

  for (const [fieldCode, schemaDef] of schema.fields) {
    if (subtableInnerCodes.has(fieldCode)) continue;
    if (currentFields.has(fieldCode)) {
      if (schemaDef.type === "SUBTABLE") {
        const currentDef = currentFields.get(fieldCode);
        if (currentDef !== undefined && currentDef.type === "SUBTABLE") {
          const {
            newInnerFields,
            existingInnerFields,
            deletedInnerFieldCodes,
          } = splitSubtableInnerFields(schemaDef, currentDef);

          const allInnerFieldsRemoved =
            existingInnerFields.size === 0 && deletedInnerFieldCodes.length > 0;

          if (newInnerFields.size > 0 || allInnerFieldsRemoved) {
            // Subtable must be deleted and re-created when:
            //  - new inner fields are being added (kintone REST API does not
            //    support adding fields to an existing subtable), OR
            //  - all existing inner fields would be removed (kintone rejects an
            //    empty subtable, so we must cascade-delete via the subtable itself).
            // Inner field deletions are handled by the cascade — do NOT push
            // deletedInnerFieldCodes here to avoid a double-delete API error.
            toDelete.push(fieldCode);
            toAdd.push(schemaDef);
          } else {
            toUpdate.push({
              ...schemaDef,
              properties: { fields: existingInnerFields },
            });

            for (const code of deletedInnerFieldCodes) {
              innerFieldsToDelete.push(code);
            }
          }
        } else {
          // Type changed from non-subtable to subtable — must delete and re-create
          toDelete.push(fieldCode);
          toAdd.push(schemaDef);
        }
      } else {
        const currentDef = currentFields.get(fieldCode);
        if (currentDef !== undefined && currentDef.type !== schemaDef.type) {
          // Type changed (e.g. SUBTABLE → SINGLE_LINE_TEXT) — kintone API does not
          // support type changes via updateFields, so delete and re-create.
          toDelete.push(fieldCode);
          toAdd.push(schemaDef);
        } else {
          toUpdate.push(schemaDef);
        }
      }
    } else {
      toAdd.push(schemaDef);
    }
  }

  const currentSubtableInnerCodes =
    collectSubtableInnerFieldCodes(currentFields);

  for (const fieldCode of currentFields.keys()) {
    if (currentSubtableInnerCodes.has(fieldCode)) continue;
    if (!schema.fields.has(fieldCode)) {
      toDelete.push(fieldCode);
    }
  }

  if (toDelete.length > 0 || innerFieldsToDelete.length > 0) {
    await container.formConfigurator.deleteFields([
      ...toDelete,
      ...innerFieldsToDelete,
    ]);
  }

  if (toAdd.length > 0) {
    await container.formConfigurator.addFields(toAdd);
  }

  if (toUpdate.length > 0) {
    await container.formConfigurator.updateFields(toUpdate);
  }

  await container.formConfigurator.updateLayout(schema.layout);
}
