export const GeneralSettingsErrorCode = {
  GsEmptyConfigText: "GS_EMPTY_CONFIG_TEXT",
  GsInvalidConfigYaml: "GS_INVALID_CONFIG_YAML",
  GsInvalidConfigStructure: "GS_INVALID_CONFIG_STRUCTURE",
  GsInvalidTheme: "GS_INVALID_THEME",
  GsInvalidIconType: "GS_INVALID_ICON_TYPE",
} as const;

export type GeneralSettingsErrorCode =
  (typeof GeneralSettingsErrorCode)[keyof typeof GeneralSettingsErrorCode];
