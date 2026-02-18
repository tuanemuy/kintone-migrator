import type { FieldPermissionCliContainerConfig } from "@/core/application/container/fieldPermissionCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";
import { resolveFilePath } from "./resolveFilePath";

export const fieldAclArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "field-acl-file": {
    type: "string" as const,
    description: "Field ACL file path (default: field-acl.yaml)",
  },
};

export type FieldAclCliValues = MultiAppCliValues & {
  "field-acl-file"?: string;
};

export function resolveFieldAclFilePath(
  cliValues: FieldAclCliValues,
  app?: AppEntry,
): string {
  return resolveFilePath({
    cliValue: cliValues["field-acl-file"],
    envVar: process.env.FIELD_ACL_FILE_PATH,
    appFileField: (a) => a.fieldAclFile,
    app,
    defaultDir: "field-acl",
    defaultFileName: "field-acl.yaml",
  });
}

export function resolveFieldAclContainerConfig(
  cliValues: FieldAclCliValues,
): FieldPermissionCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    fieldAclFilePath: resolveFieldAclFilePath(cliValues),
  };
}

export function resolveFieldAclAppContainerConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: FieldAclCliValues,
): FieldPermissionCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    fieldAclFilePath: resolveFieldAclFilePath(cliValues, app),
  };
}
