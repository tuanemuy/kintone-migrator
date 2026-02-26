import type { FieldPermissionCliContainerConfig } from "@/core/application/container/fieldPermissionCli";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

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
} = createDomainConfigResolver<
  FieldPermissionCliContainerConfig,
  "field-acl-file",
  FieldAclCliValues
>({
  fileArgKey: "field-acl-file",
  envVar: () => process.env.FIELD_ACL_FILE_PATH,
  appFileField: (a) => a.fieldAclFile,
  defaultDir: "field-acl",
  defaultFileName: "field-acl.yaml",
  buildConfig: (base, filePath) => ({
    ...base,
    fieldAclFilePath: filePath,
  }),
});

export {
  resolveFieldAclFilePath,
  resolveFieldAclContainerConfig,
  resolveFieldAclAppContainerConfig,
};
