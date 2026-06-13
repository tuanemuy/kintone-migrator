export const AdminNotesErrorCode = {
  AnInvalidConfigStructure: "AN_INVALID_CONFIG_STRUCTURE",
  AnUnresolvedConflict: "AN_UNRESOLVED_CONFLICT",
} as const;

export type AdminNotesErrorCode =
  (typeof AdminNotesErrorCode)[keyof typeof AdminNotesErrorCode];
