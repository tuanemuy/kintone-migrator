export const AdminNotesErrorCode = {
  AnEmptyConfigText: "AN_EMPTY_CONFIG_TEXT",
  AnInvalidConfigYaml: "AN_INVALID_CONFIG_YAML",
  AnInvalidConfigStructure: "AN_INVALID_CONFIG_STRUCTURE",
} as const;

export type AdminNotesErrorCode =
  (typeof AdminNotesErrorCode)[keyof typeof AdminNotesErrorCode];
