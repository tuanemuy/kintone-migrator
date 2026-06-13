export const ActionErrorCode = {
  AcInvalidConfigStructure: "AC_INVALID_CONFIG_STRUCTURE",
  AcInvalidSrcType: "AC_INVALID_SRC_TYPE",
  AcInvalidEntityType: "AC_INVALID_ENTITY_TYPE",
  AcEmptyActionName: "AC_EMPTY_ACTION_NAME",
  AcDuplicateIndex: "AC_DUPLICATE_INDEX",
  AcUnresolvedConflict: "AC_UNRESOLVED_CONFLICT",
} as const;

export type ActionErrorCode =
  (typeof ActionErrorCode)[keyof typeof ActionErrorCode];
