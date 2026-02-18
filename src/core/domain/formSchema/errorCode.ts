export const FormSchemaErrorCode = {
  EmptyFieldCode: "EMPTY_FIELD_CODE",
  EmptySchemaText: "EMPTY_SCHEMA_TEXT",
  InvalidSchemaFormat: "INVALID_SCHEMA_FORMAT",
  InvalidSchemaStructure: "INVALID_SCHEMA_STRUCTURE",
  DuplicateFieldCode: "DUPLICATE_FIELD_CODE",
  InvalidFieldType: "INVALID_FIELD_TYPE",
  InvalidLayoutStructure: "INVALID_LAYOUT_STRUCTURE",
  InvalidDecorationElement: "INVALID_DECORATION_ELEMENT",
} as const;

export type FormSchemaErrorCode =
  (typeof FormSchemaErrorCode)[keyof typeof FormSchemaErrorCode];
