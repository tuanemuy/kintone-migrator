export const ActionErrorCode = {
  AcEmptyConfigText: "AC_EMPTY_CONFIG_TEXT",
  AcInvalidConfigYaml: "AC_INVALID_CONFIG_YAML",
  AcInvalidConfigStructure: "AC_INVALID_CONFIG_STRUCTURE",
  AcInvalidSrcType: "AC_INVALID_SRC_TYPE",
  AcInvalidEntityType: "AC_INVALID_ENTITY_TYPE",
  AcEmptyActionName: "AC_EMPTY_ACTION_NAME",
} as const;

export type ActionErrorCode =
  (typeof ActionErrorCode)[keyof typeof ActionErrorCode];
