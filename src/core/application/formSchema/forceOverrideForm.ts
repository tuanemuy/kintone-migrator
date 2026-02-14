import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import { collectSubtableInnerFieldCodes } from "@/core/domain/formSchema/entity";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import type { ServiceArgs } from "../types";
import { parseSchemaText } from "./parseSchema";

export async function forceOverrideForm({
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
  const currentFields = await container.formConfigurator.getFields();
  const subtableInnerCodes = collectSubtableInnerFieldCodes(schema.fields);

  const toAdd: FieldDefinition[] = [];
  const toUpdate: FieldDefinition[] = [];
  const toDelete: FieldCode[] = [];

  for (const [fieldCode, schemaDef] of schema.fields) {
    if (subtableInnerCodes.has(fieldCode)) continue;
    if (currentFields.has(fieldCode)) {
      toUpdate.push(schemaDef);
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

  if (toAdd.length > 0) {
    await container.formConfigurator.addFields(toAdd);
  }

  if (toUpdate.length > 0) {
    await container.formConfigurator.updateFields(toUpdate);
  }

  if (toDelete.length > 0) {
    await container.formConfigurator.deleteFields(toDelete);
  }

  await container.formConfigurator.updateLayout(schema.layout);
}
