export const FormSchemaErrorCode = {
  FsEmptyFieldCode: "FS_EMPTY_FIELD_CODE",
  FsEmptySchemaText: "FS_EMPTY_SCHEMA_TEXT",
  FsInvalidSchemaFormat: "FS_INVALID_SCHEMA_FORMAT",
  FsInvalidSchemaStructure: "FS_INVALID_SCHEMA_STRUCTURE",
  FsDuplicateFieldCode: "FS_DUPLICATE_FIELD_CODE",
  FsInvalidFieldType: "FS_INVALID_FIELD_TYPE",
  FsInvalidLayoutStructure: "FS_INVALID_LAYOUT_STRUCTURE",
  FsInvalidDecorationElement: "FS_INVALID_DECORATION_ELEMENT",
} as const;

export type FormSchemaErrorCode =
  (typeof FormSchemaErrorCode)[keyof typeof FormSchemaErrorCode];
