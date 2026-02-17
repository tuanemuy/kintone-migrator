import type { AppPermissionCliContainerConfig } from "@/core/application/container/appPermissionCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";

export const appAclArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "app-acl-file": {
    type: "string" as const,
    description: "App ACL file path (default: app-acl.yaml)",
  },
};

export type AppAclCliValues = MultiAppCliValues & {
  "app-acl-file"?: string;
};

export function resolveAppAclFilePath(
  cliValues: AppAclCliValues,
  app?: AppEntry,
): string {
  return (
    cliValues["app-acl-file"] ??
    process.env.APP_ACL_FILE_PATH ??
    (app ? `app-acl/${app.name}.yaml` : "app-acl.yaml")
  );
}

export function resolveAppAclContainerConfig(
  cliValues: AppAclCliValues,
): AppPermissionCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    appAclFilePath: resolveAppAclFilePath(cliValues),
  };
}

export function resolveAppAclAppContainerConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: AppAclCliValues,
): AppPermissionCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    appAclFilePath: resolveAppAclFilePath(cliValues, app),
  };
}
