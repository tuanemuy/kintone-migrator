export const FieldPermissionErrorCode = {
  FpEmptyConfigText: "FP_EMPTY_CONFIG_TEXT",
  FpInvalidConfigYaml: "FP_INVALID_CONFIG_YAML",
  FpInvalidConfigStructure: "FP_INVALID_CONFIG_STRUCTURE",
  FpInvalidAccessibility: "FP_INVALID_ACCESSIBILITY",
  FpInvalidEntityType: "FP_INVALID_ENTITY_TYPE",
  FpEmptyFieldCode: "FP_EMPTY_FIELD_CODE",
  FpEmptyEntityCode: "FP_EMPTY_ENTITY_CODE",
  FpDuplicateFieldCode: "FP_DUPLICATE_FIELD_CODE",
} as const;

export type FieldPermissionErrorCode =
  (typeof FieldPermissionErrorCode)[keyof typeof FieldPermissionErrorCode];
