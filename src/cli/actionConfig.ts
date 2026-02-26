import type { ActionCliContainerConfig } from "@/core/application/container/actionCli";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

export const actionArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "action-file": {
    type: "string" as const,
    description: "Action file path (default: actions.yaml)",
  },
};

export type ActionCliValues = MultiAppCliValues & {
  "action-file"?: string;
};

const {
  resolveFilePath: resolveActionFilePath,
  resolveContainerConfig: resolveActionContainerConfig,
  resolveAppContainerConfig: resolveActionAppContainerConfig,
} = createDomainConfigResolver<
  ActionCliContainerConfig,
  "action-file",
  ActionCliValues
>({
  fileArgKey: "action-file",
  envVar: () => process.env.ACTION_FILE_PATH,
  appFileField: (a) => a.actionFile,
  defaultDir: "action",
  defaultFileName: "actions.yaml",
  buildConfig: (base, filePath) => ({ ...base, actionFilePath: filePath }),
});

export {
  resolveActionFilePath,
  resolveActionContainerConfig,
  resolveActionAppContainerConfig,
};
