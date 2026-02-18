import type { ActionCliContainerConfig } from "@/core/application/container/actionCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";
import { resolveFilePath } from "./resolveFilePath";

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

export function resolveActionFilePath(
  cliValues: ActionCliValues,
  app?: AppEntry,
): string {
  return resolveFilePath({
    cliValue: cliValues["action-file"],
    envVar: process.env.ACTION_FILE_PATH,
    appFileField: (a) => a.actionFile,
    app,
    defaultDir: "action",
    defaultFileName: "actions.yaml",
  });
}

export function resolveActionContainerConfig(
  cliValues: ActionCliValues,
): ActionCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    actionFilePath: resolveActionFilePath(cliValues),
  };
}

export function resolveActionAppContainerConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: ActionCliValues,
): ActionCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    actionFilePath: resolveActionFilePath(cliValues, app),
  };
}
