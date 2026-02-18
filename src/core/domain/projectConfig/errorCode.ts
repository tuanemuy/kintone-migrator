export const ProjectConfigErrorCode = {
  PcCircularDependency: "PC_CIRCULAR_DEPENDENCY",
  PcUnknownDependency: "PC_UNKNOWN_DEPENDENCY",
  PcEmptyApps: "PC_EMPTY_APPS",
  PcEmptyAppId: "PC_EMPTY_APP_ID",
  PcEmptyAppName: "PC_EMPTY_APP_NAME",
  PcInvalidConfigStructure: "PC_INVALID_CONFIG_STRUCTURE",
  PcInvalidAuthConfig: "PC_INVALID_AUTH_CONFIG",
} as const;

export type ProjectConfigErrorCode =
  (typeof ProjectConfigErrorCode)[keyof typeof ProjectConfigErrorCode];
