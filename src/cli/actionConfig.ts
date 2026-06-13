import type { ActionCliContainerConfig } from "@/core/application/container/actionCli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const ACTION_STATE_FILE = "action.yaml";

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
} = createDomainConfigResolver({
  fileArgKey: "action-file",
  envVar: () => process.env.ACTION_FILE_PATH,
  appFileField: (a) => a.actionFile,
  defaultDir: "action",
  defaultFileName: "actions.yaml",
  buildConfig: (base, filePath, app): ActionCliContainerConfig => ({
    ...base,
    actionFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode.
    actionStateFilePath: app
      ? buildDomainStateFilePath(app.name, ACTION_STATE_FILE)
      : buildLegacyDomainStateFilePath(ACTION_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolveActionFilePath,
  resolveActionContainerConfig,
  resolveActionAppContainerConfig,
};
