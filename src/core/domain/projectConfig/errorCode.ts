export const ProjectConfigErrorCode = {
  CircularDependency: "CIRCULAR_DEPENDENCY",
  UnknownDependency: "UNKNOWN_DEPENDENCY",
  EmptyApps: "EMPTY_APPS",
  EmptyAppId: "EMPTY_APP_ID",
  EmptyAppName: "EMPTY_APP_NAME",
  MissingDomain: "MISSING_DOMAIN",
  MissingAuth: "MISSING_AUTH",
} as const;

export type ProjectConfigErrorCode =
  (typeof ProjectConfigErrorCode)[keyof typeof ProjectConfigErrorCode];
