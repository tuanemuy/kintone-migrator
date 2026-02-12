export const FormSchemaErrorCode = {
  EmptyFieldCode: "EMPTY_FIELD_CODE",
  EmptySchemaText: "EMPTY_SCHEMA_TEXT",
  InvalidSchemaJson: "INVALID_SCHEMA_JSON",
  InvalidSchemaStructure: "INVALID_SCHEMA_STRUCTURE",
  DuplicateFieldCode: "DUPLICATE_FIELD_CODE",
  InvalidFieldType: "INVALID_FIELD_TYPE",
  InvalidLayoutStructure: "INVALID_LAYOUT_STRUCTURE",
  InvalidDecorationElement: "INVALID_DECORATION_ELEMENT",
} as const;

export type FormSchemaErrorCode =
  (typeof FormSchemaErrorCode)[keyof typeof FormSchemaErrorCode];
