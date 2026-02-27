import type { RecordPermissionCliContainerConfig } from "@/core/application/container/recordPermissionCli";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

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
  buildConfig: (base, filePath): RecordPermissionCliContainerConfig => ({
    ...base,
    recordAclFilePath: filePath,
  }),
});

export {
  resolveRecordAclFilePath,
  resolveRecordAclContainerConfig,
  resolveRecordAclAppContainerConfig,
};
