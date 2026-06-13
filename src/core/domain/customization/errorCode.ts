export const CustomizationErrorCode = {
  CzInvalidConfigStructure: "CZ_INVALID_CONFIG_STRUCTURE",
  CzInvalidScope: "CZ_INVALID_SCOPE",
  CzInvalidResourceType: "CZ_INVALID_RESOURCE_TYPE",
  CzTooManyFiles: "CZ_TOO_MANY_FILES",
  CzUnresolvedConflict: "CZ_UNRESOLVED_CONFLICT",
} as const;

export type CustomizationErrorCode =
  (typeof CustomizationErrorCode)[keyof typeof CustomizationErrorCode];
