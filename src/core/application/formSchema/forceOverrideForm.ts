import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import { collectSubtableInnerFieldCodes } from "@/core/domain/formSchema/entity";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import type { Container } from "../container";
import type { ServiceArgs } from "../types";
import { assertSchemaValid } from "./assertSchemaValid";
import { parseSchemaText } from "./parseSchema";

export async function forceOverrideForm({
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

  const currentFields = await container.formConfigurator.getFields();
  const subtableInnerCodes = collectSubtableInnerFieldCodes(schema.fields);

  const toAdd: FieldDefinition[] = [];
  const toUpdate: FieldDefinition[] = [];
  const toDelete: FieldCode[] = [];

  for (const [fieldCode, schemaDef] of schema.fields) {
    if (subtableInnerCodes.has(fieldCode)) continue;
    if (currentFields.has(fieldCode)) {
      if (schemaDef.type === "SUBTABLE") {
        const currentDef = currentFields.get(fieldCode);
        if (currentDef !== undefined && currentDef.type === "SUBTABLE") {
          const newInnerFields = new Map<FieldCode, FieldDefinition>();
          const existingInnerFields = new Map<FieldCode, FieldDefinition>();

          for (const [code, def] of schemaDef.properties.fields) {
            if (currentDef.properties.fields.has(code)) {
              existingInnerFields.set(code, def);
            } else {
              newInnerFields.set(code, def);
            }
          }

          if (newInnerFields.size > 0) {
            toAdd.push({
              ...schemaDef,
              properties: { fields: newInnerFields },
            });
          }

          if (existingInnerFields.size > 0) {
            toUpdate.push({
              ...schemaDef,
              properties: { fields: existingInnerFields },
            });
          }
        } else {
          toUpdate.push(schemaDef);
        }
      } else {
        toUpdate.push(schemaDef);
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
