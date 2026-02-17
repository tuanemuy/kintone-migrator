import type { FieldPermissionCliContainerConfig } from "@/core/application/container/fieldPermissionCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";

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
  return (
    cliValues["field-acl-file"] ??
    process.env.FIELD_ACL_FILE_PATH ??
    app?.fieldAclFile ??
    (app ? `field-acl/${app.name}.yaml` : "field-acl.yaml")
  );
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
