import type { AppName } from "./valueObject";

export type AuthConfig =
  | { readonly type: "apiToken"; readonly apiToken: string }
  | {
      readonly type: "password";
      readonly username: string;
      readonly password: string;
    };

export type AppEntry = Readonly<{
  name: AppName;
  appId: string;
  schemaFile: string;
  seedFile?: string;
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
  error?: unknown;
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
