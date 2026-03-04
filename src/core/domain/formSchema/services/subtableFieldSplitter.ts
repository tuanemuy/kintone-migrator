import type {
  FieldCode,
  FieldDefinition,
  SubtableFieldDefinition,
} from "../valueObject";

export type SubtableSplitResult = Readonly<{
  newInnerFields: ReadonlyMap<FieldCode, FieldDefinition>;
  existingInnerFields: ReadonlyMap<FieldCode, FieldDefinition>;
  deletedInnerFieldCodes: readonly FieldCode[];
}>;

export function splitSubtableInnerFields(
  desired: SubtableFieldDefinition,
  current: SubtableFieldDefinition,
): SubtableSplitResult {
  const newInnerFields = new Map<FieldCode, FieldDefinition>();
  const existingInnerFields = new Map<FieldCode, FieldDefinition>();
  const deletedInnerFieldCodes: FieldCode[] = [];

  for (const [code, def] of desired.properties.fields) {
    if (current.properties.fields.has(code)) {
      existingInnerFields.set(code, def);
    } else {
      newInnerFields.set(code, def);
    }
  }

  for (const code of current.properties.fields.keys()) {
    if (!desired.properties.fields.has(code)) {
      deletedInnerFieldCodes.push(code);
    }
  }

  return { newInnerFields, existingInnerFields, deletedInnerFieldCodes };
}
