export const ViewErrorCode = {
  VwEmptyConfigText: "VW_EMPTY_CONFIG_TEXT",
  VwInvalidConfigYaml: "VW_INVALID_CONFIG_YAML",
  VwInvalidConfigStructure: "VW_INVALID_CONFIG_STRUCTURE",
  VwInvalidViewType: "VW_INVALID_VIEW_TYPE",
  VwInvalidDeviceType: "VW_INVALID_DEVICE_TYPE",
  VwEmptyViewName: "VW_EMPTY_VIEW_NAME",
} as const;

export type ViewErrorCode = (typeof ViewErrorCode)[keyof typeof ViewErrorCode];
