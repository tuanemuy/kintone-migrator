export const CustomizationErrorCode = {
  CzEmptyConfigText: "CZ_EMPTY_CONFIG_TEXT",
  CzInvalidConfigYaml: "CZ_INVALID_CONFIG_YAML",
  CzInvalidConfigStructure: "CZ_INVALID_CONFIG_STRUCTURE",
  CzInvalidScope: "CZ_INVALID_SCOPE",
  CzInvalidResourceType: "CZ_INVALID_RESOURCE_TYPE",
  CzTooManyFiles: "CZ_TOO_MANY_FILES",
} as const;

export type CustomizationErrorCode =
  (typeof CustomizationErrorCode)[keyof typeof CustomizationErrorCode];
