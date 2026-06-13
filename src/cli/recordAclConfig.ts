import type { RecordPermissionCliContainerConfig } from "@/core/application/container/recordPermissionCli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const RECORD_ACL_STATE_FILE = "record-acl.yaml";

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

const {
  resolveFilePath: resolveRecordAclFilePath,
  resolveContainerConfig: resolveRecordAclContainerConfig,
  resolveAppContainerConfig: resolveRecordAclAppContainerConfig,
} = createDomainConfigResolver({
  fileArgKey: "record-acl-file",
  envVar: () => process.env.RECORD_ACL_FILE_PATH,
  appFileField: (a) => a.recordAclFile,
  defaultDir: "record-acl",
  defaultFileName: "record-acl.yaml",
  buildConfig: (base, filePath, app): RecordPermissionCliContainerConfig => ({
    ...base,
    recordAclFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode.
    recordAclStateFilePath: app
      ? buildDomainStateFilePath(app.name, RECORD_ACL_STATE_FILE)
      : buildLegacyDomainStateFilePath(RECORD_ACL_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolveRecordAclFilePath,
  resolveRecordAclContainerConfig,
  resolveRecordAclAppContainerConfig,
};
