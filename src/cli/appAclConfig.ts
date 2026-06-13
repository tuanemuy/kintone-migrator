import type { AppPermissionCliContainerConfig } from "@/core/application/container/appPermissionCli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const APP_ACL_STATE_FILE = "app-acl.yaml";

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

const {
  resolveFilePath: resolveAppAclFilePath,
  resolveContainerConfig: resolveAppAclContainerConfig,
  resolveAppContainerConfig: resolveAppAclAppContainerConfig,
} = createDomainConfigResolver({
  fileArgKey: "app-acl-file",
  envVar: () => process.env.APP_ACL_FILE_PATH,
  appFileField: (a) => a.appAclFile,
  defaultDir: "app-acl",
  defaultFileName: "app-acl.yaml",
  buildConfig: (base, filePath, app): AppPermissionCliContainerConfig => ({
    ...base,
    appAclFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode.
    appAclStateFilePath: app
      ? buildDomainStateFilePath(app.name, APP_ACL_STATE_FILE)
      : buildLegacyDomainStateFilePath(APP_ACL_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolveAppAclFilePath,
  resolveAppAclContainerConfig,
  resolveAppAclAppContainerConfig,
};
