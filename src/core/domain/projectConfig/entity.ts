import type { AppName } from "./valueObject";

export type AuthConfig =
  | { readonly type: "apiToken"; readonly apiToken: string }
  | {
      readonly type: "password";
      readonly username: string;
      readonly password: string;
    };

/**
 * Represents a single app entry in the project config.
 *
 * File path fields are kept flat (not nested under a `files` sub-object) to
 * maintain a 1:1 mapping with the parsed YAML structure in `configParser.ts`.
 * For grouped access to file paths, use `AppFilePaths` from `appFilePaths.ts`.
 */
export type AppEntry = Readonly<{
  name: AppName;
  appId: string;
  schemaFile?: string;
  seedFile?: string;
  customizeFile?: string;
  fieldAclFile?: string;
  viewFile?: string;
  appAclFile?: string;
  recordAclFile?: string;
  processFile?: string;
  settingsFile?: string;
  notificationFile?: string;
  reportFile?: string;
  actionFile?: string;
  adminNotesFile?: string;
  pluginFile?: string;
  domain?: string;
  auth?: AuthConfig;
  guestSpaceId?: string;
  dependsOn: readonly AppName[];
}>;

export type ProjectConfig = Readonly<{
  domain?: string;
  auth?: AuthConfig;
  guestSpaceId?: string;
  apps: ReadonlyMap<AppName, AppEntry>;
}>;

export type AppExecutionStatus = "succeeded" | "failed" | "skipped";

export type AppExecutionResult = Readonly<{
  name: AppName;
  status: AppExecutionStatus;
  error?: Error;
}>;

export type ExecutionPlan = Readonly<{
  orderedApps: readonly AppEntry[];
}>;

export type MultiAppResult = Readonly<{
  results: readonly AppExecutionResult[];
  hasFailure: boolean;
}>;

export const MultiAppResult = {
  create: (results: readonly AppExecutionResult[]): MultiAppResult => ({
    results,
    hasFailure: results.some((r) => r.status === "failed"),
  }),
};
