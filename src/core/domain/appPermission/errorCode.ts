export const AppPermissionErrorCode = {
  ApEmptyConfigText: "AP_EMPTY_CONFIG_TEXT",
  ApInvalidConfigYaml: "AP_INVALID_CONFIG_YAML",
  ApInvalidConfigStructure: "AP_INVALID_CONFIG_STRUCTURE",
  ApInvalidEntityType: "AP_INVALID_ENTITY_TYPE",
  ApInvalidBooleanField: "AP_INVALID_BOOLEAN_FIELD",
  ApEmptyEntityCode: "AP_EMPTY_ENTITY_CODE",
  ApDuplicateEntity: "AP_DUPLICATE_ENTITY",
} as const;

export type AppPermissionErrorCode =
  (typeof AppPermissionErrorCode)[keyof typeof AppPermissionErrorCode];
