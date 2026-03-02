export const PluginErrorCode = {
  PlEmptyConfigText: "PL_EMPTY_CONFIG_TEXT",
  PlInvalidConfigYaml: "PL_INVALID_CONFIG_YAML",
  PlInvalidConfigStructure: "PL_INVALID_CONFIG_STRUCTURE",
  PlEmptyPluginId: "PL_EMPTY_PLUGIN_ID",
  PlDuplicatePluginId: "PL_DUPLICATE_PLUGIN_ID",
} as const;

export type PluginErrorCode =
  (typeof PluginErrorCode)[keyof typeof PluginErrorCode];
