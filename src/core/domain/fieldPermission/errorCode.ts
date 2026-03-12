export const FieldPermissionErrorCode = {
  FpInvalidConfigStructure: "FP_INVALID_CONFIG_STRUCTURE",
  FpInvalidAccessibility: "FP_INVALID_ACCESSIBILITY",
  FpInvalidEntityType: "FP_INVALID_ENTITY_TYPE",
  FpInvalidBooleanField: "FP_INVALID_BOOLEAN_FIELD",
  FpEmptyFieldCode: "FP_EMPTY_FIELD_CODE",
  FpEmptyEntityCode: "FP_EMPTY_ENTITY_CODE",
  FpDuplicateFieldCode: "FP_DUPLICATE_FIELD_CODE",
} as const;

export type FieldPermissionErrorCode =
  (typeof FieldPermissionErrorCode)[keyof typeof FieldPermissionErrorCode];
