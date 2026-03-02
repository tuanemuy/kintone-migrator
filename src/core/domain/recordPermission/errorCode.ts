export const RecordPermissionErrorCode = {
  RpEmptyConfigText: "RP_EMPTY_CONFIG_TEXT",
  RpInvalidConfigYaml: "RP_INVALID_CONFIG_YAML",
  RpInvalidConfigStructure: "RP_INVALID_CONFIG_STRUCTURE",
  RpInvalidEntityType: "RP_INVALID_ENTITY_TYPE",
  RpEmptyEntityCode: "RP_EMPTY_ENTITY_CODE",
  RpInvalidPermissionValue: "RP_INVALID_PERMISSION_VALUE",
  RpDuplicateEntity: "RP_DUPLICATE_ENTITY",
} as const;

export type RecordPermissionErrorCode =
  (typeof RecordPermissionErrorCode)[keyof typeof RecordPermissionErrorCode];
