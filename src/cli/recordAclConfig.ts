import type { RecordPermissionCliContainerConfig } from "@/core/application/container/recordPermissionCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";
import { resolveFilePath } from "./resolveFilePath";

export const recordAclArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "record-acl-file": {
    type: "string" as const,
    description: "Record ACL file path (default: record-acl.yaml)",
  },
};

export type RecordAclCliValues = MultiAppCliValues & {
  "record-acl-file"?: string;
};

export function resolveRecordAclFilePath(
  cliValues: RecordAclCliValues,
  app?: AppEntry,
): string {
  return resolveFilePath({
    cliValue: cliValues["record-acl-file"],
    envVar: process.env.RECORD_ACL_FILE_PATH,
    appFileField: (a) => a.recordAclFile,
    app,
    defaultDir: "record-acl",
    defaultFileName: "record-acl.yaml",
  });
}

export function resolveRecordAclContainerConfig(
  cliValues: RecordAclCliValues,
): RecordPermissionCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    recordAclFilePath: resolveRecordAclFilePath(cliValues),
  };
}

export function resolveRecordAclAppContainerConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: RecordAclCliValues,
): RecordPermissionCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    recordAclFilePath: resolveRecordAclFilePath(cliValues, app),
  };
}
