export const ProjectConfigErrorCode = {
  CircularDependency: "CIRCULAR_DEPENDENCY",
  UnknownDependency: "UNKNOWN_DEPENDENCY",
  EmptyApps: "EMPTY_APPS",
  EmptyAppId: "EMPTY_APP_ID",
  EmptyAppName: "EMPTY_APP_NAME",
  InvalidConfigStructure: "INVALID_CONFIG_STRUCTURE",
  InvalidAuthConfig: "INVALID_AUTH_CONFIG",
} as const;

export type ProjectConfigErrorCode =
  (typeof ProjectConfigErrorCode)[keyof typeof ProjectConfigErrorCode];
