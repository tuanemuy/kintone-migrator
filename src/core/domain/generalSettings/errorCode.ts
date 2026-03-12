export const GeneralSettingsErrorCode = {
  GsInvalidConfigStructure: "GS_INVALID_CONFIG_STRUCTURE",
  GsInvalidTheme: "GS_INVALID_THEME",
  GsInvalidIconType: "GS_INVALID_ICON_TYPE",
  GsInvalidBooleanField: "GS_INVALID_BOOLEAN_FIELD",
  GsInvalidNumberPrecision: "GS_INVALID_NUMBER_PRECISION",
} as const;

export type GeneralSettingsErrorCode =
  (typeof GeneralSettingsErrorCode)[keyof typeof GeneralSettingsErrorCode];
