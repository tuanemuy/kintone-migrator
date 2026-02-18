import type { AppPermissionCliContainerConfig } from "@/core/application/container/appPermissionCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";
import { resolveFilePath } from "./resolveFilePath";

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
  return resolveFilePath({
    cliValue: cliValues["app-acl-file"],
    envVar: process.env.APP_ACL_FILE_PATH,
    appFileField: (a) => a.appAclFile,
    app,
    defaultDir: "app-acl",
    defaultFileName: "app-acl.yaml",
  });
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
