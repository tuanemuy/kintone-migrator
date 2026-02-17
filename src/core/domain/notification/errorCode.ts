export const NotificationErrorCode = {
  NtEmptyConfigText: "NT_EMPTY_CONFIG_TEXT",
  NtInvalidConfigYaml: "NT_INVALID_CONFIG_YAML",
  NtInvalidConfigStructure: "NT_INVALID_CONFIG_STRUCTURE",
  NtInvalidEntityType: "NT_INVALID_ENTITY_TYPE",
  NtEmptyEntityCode: "NT_EMPTY_ENTITY_CODE",
  NtMissingRequiredField: "NT_MISSING_REQUIRED_FIELD",
  NtConflictingTimingFields: "NT_CONFLICTING_TIMING_FIELDS",
} as const;

export type NotificationErrorCode =
  (typeof NotificationErrorCode)[keyof typeof NotificationErrorCode];
