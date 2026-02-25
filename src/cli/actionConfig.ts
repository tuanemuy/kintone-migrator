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
  "action-file",
  "actionFilePath",
  ActionCliValues
>({
  fileArgKey: "action-file",
  envVar: () => process.env.ACTION_FILE_PATH,
  appFileField: (a) => a.actionFile,
  defaultDir: "action",
  defaultFileName: "actions.yaml",
  filePathKey: "actionFilePath",
});

export {
  resolveActionFilePath,
  resolveActionContainerConfig,
  resolveActionAppContainerConfig,
};
