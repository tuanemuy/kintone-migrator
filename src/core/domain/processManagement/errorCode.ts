export const ProcessManagementErrorCode = {
  PmEmptyConfigText: "PM_EMPTY_CONFIG_TEXT",
  PmInvalidConfigYaml: "PM_INVALID_CONFIG_YAML",
  PmInvalidConfigStructure: "PM_INVALID_CONFIG_STRUCTURE",
  PmInvalidAssigneeType: "PM_INVALID_ASSIGNEE_TYPE",
  PmInvalidEntityType: "PM_INVALID_ENTITY_TYPE",
  PmInvalidActionReference: "PM_INVALID_ACTION_REFERENCE",
} as const;

export type ProcessManagementErrorCode =
  (typeof ProcessManagementErrorCode)[keyof typeof ProcessManagementErrorCode];
