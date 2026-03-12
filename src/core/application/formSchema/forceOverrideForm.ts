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

type FieldClassification = {
  toAdd: FieldDefinition[];
  toUpdate: FieldDefinition[];
  toDelete: FieldCode[];
  innerFieldsToDelete: FieldCode[];
};

function classifySubtableField(
  fieldCode: FieldCode,
  schemaDef: FieldDefinition & { type: "SUBTABLE" },
  currentFields: ReadonlyMap<FieldCode, FieldDefinition>,
  result: FieldClassification,
): void {
  const currentDef = currentFields.get(fieldCode);
  if (currentDef !== undefined && currentDef.type === "SUBTABLE") {
    const { newInnerFields, existingInnerFields, deletedInnerFieldCodes } =
      splitSubtableInnerFields(schemaDef, currentDef);

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
      result.toDelete.push(fieldCode);
      result.toAdd.push(schemaDef);
    } else {
      result.toUpdate.push({
        ...schemaDef,
        properties: { fields: existingInnerFields },
      });

      for (const code of deletedInnerFieldCodes) {
        result.innerFieldsToDelete.push(code);
      }
    }
  } else {
    // Type changed from non-subtable to subtable — must delete and re-create
    result.toDelete.push(fieldCode);
    result.toAdd.push(schemaDef);
  }
}

function classifyExistingField(
  fieldCode: FieldCode,
  schemaDef: FieldDefinition,
  currentFields: ReadonlyMap<FieldCode, FieldDefinition>,
  result: FieldClassification,
): void {
  if (schemaDef.type === "SUBTABLE") {
    classifySubtableField(
      fieldCode,
      schemaDef as FieldDefinition & { type: "SUBTABLE" },
      currentFields,
      result,
    );
  } else {
    const currentDef = currentFields.get(fieldCode);
    if (currentDef !== undefined && currentDef.type !== schemaDef.type) {
      // Type changed — kintone API does not support type changes via
      // updateFields, so delete and re-create.
      result.toDelete.push(fieldCode);
      result.toAdd.push(schemaDef);
    } else {
      result.toUpdate.push(schemaDef);
    }
  }
}

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
  const schema = parseSchemaText(container.configCodec, result.content);

  assertSchemaValid(schema);

  const currentFields = await container.formConfigurator.getFields();
  const subtableInnerCodes = collectSubtableInnerFieldCodes(schema.fields);

  const classification: FieldClassification = {
    toAdd: [],
    toUpdate: [],
    toDelete: [],
    innerFieldsToDelete: [],
  };

  for (const [fieldCode, schemaDef] of schema.fields) {
    if (subtableInnerCodes.has(fieldCode)) continue;
    if (currentFields.has(fieldCode)) {
      classifyExistingField(
        fieldCode,
        schemaDef,
        currentFields,
        classification,
      );
    } else {
      classification.toAdd.push(schemaDef);
    }
  }

  const currentSubtableInnerCodes =
    collectSubtableInnerFieldCodes(currentFields);

  for (const fieldCode of currentFields.keys()) {
    if (currentSubtableInnerCodes.has(fieldCode)) continue;
    if (!schema.fields.has(fieldCode)) {
      classification.toDelete.push(fieldCode);
    }
  }

  if (
    classification.toDelete.length > 0 ||
    classification.innerFieldsToDelete.length > 0
  ) {
    await container.formConfigurator.deleteFields([
      ...classification.toDelete,
      ...classification.innerFieldsToDelete,
    ]);
  }

  if (classification.toAdd.length > 0) {
    await container.formConfigurator.addFields(classification.toAdd);
  }

  if (classification.toUpdate.length > 0) {
    await container.formConfigurator.updateFields(classification.toUpdate);
  }

  await container.formConfigurator.updateLayout(schema.layout);
}
