import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

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
} = createDomainConfigResolver<
  "app-acl-file",
  "appAclFilePath",
  AppAclCliValues
>({
  fileArgKey: "app-acl-file",
  envVar: () => process.env.APP_ACL_FILE_PATH,
  appFileField: (a) => a.appAclFile,
  defaultDir: "app-acl",
  defaultFileName: "app-acl.yaml",
  filePathKey: "appAclFilePath",
});

export {
  resolveAppAclFilePath,
  resolveAppAclContainerConfig,
  resolveAppAclAppContainerConfig,
};
