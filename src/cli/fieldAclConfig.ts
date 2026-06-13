import type { FieldPermissionCliContainerConfig } from "@/core/application/container/fieldPermissionCli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const FIELD_ACL_STATE_FILE = "field-acl.yaml";

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

const {
  resolveFilePath: resolveFieldAclFilePath,
  resolveContainerConfig: resolveFieldAclContainerConfig,
  resolveAppContainerConfig: resolveFieldAclAppContainerConfig,
} = createDomainConfigResolver({
  fileArgKey: "field-acl-file",
  envVar: () => process.env.FIELD_ACL_FILE_PATH,
  appFileField: (a) => a.fieldAclFile,
  defaultDir: "field-acl",
  defaultFileName: "field-acl.yaml",
  buildConfig: (base, filePath, app): FieldPermissionCliContainerConfig => ({
    ...base,
    fieldAclFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode.
    fieldAclStateFilePath: app
      ? buildDomainStateFilePath(app.name, FIELD_ACL_STATE_FILE)
      : buildLegacyDomainStateFilePath(FIELD_ACL_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolveFieldAclFilePath,
  resolveFieldAclContainerConfig,
  resolveFieldAclAppContainerConfig,
};
