export const ViewErrorCode = {
  VwInvalidConfigStructure: "VW_INVALID_CONFIG_STRUCTURE",
  VwInvalidViewType: "VW_INVALID_VIEW_TYPE",
  VwInvalidDeviceType: "VW_INVALID_DEVICE_TYPE",
  VwEmptyViewName: "VW_EMPTY_VIEW_NAME",
  VwInvalidIndex: "VW_INVALID_INDEX",
} as const;

export type ViewErrorCode = (typeof ViewErrorCode)[keyof typeof ViewErrorCode];
