export const AdminNotesErrorCode = {
  AnInvalidConfigStructure: "AN_INVALID_CONFIG_STRUCTURE",
} as const;

export type AdminNotesErrorCode =
  (typeof AdminNotesErrorCode)[keyof typeof AdminNotesErrorCode];
