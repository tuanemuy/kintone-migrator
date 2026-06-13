export const PluginErrorCode = {
  PlInvalidConfigStructure: "PL_INVALID_CONFIG_STRUCTURE",
  PlEmptyPluginId: "PL_EMPTY_PLUGIN_ID",
  PlDuplicatePluginId: "PL_DUPLICATE_PLUGIN_ID",
  PlUnresolvedConflict: "PL_UNRESOLVED_CONFLICT",
} as const;

export type PluginErrorCode =
  (typeof PluginErrorCode)[keyof typeof PluginErrorCode];
