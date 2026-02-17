import type { ProcessManagementCliContainerConfig } from "@/core/application/container/processManagementCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";

export const processArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "process-file": {
    type: "string" as const,
    description: "Process management file path (default: process.yaml)",
  },
};

export type ProcessCliValues = MultiAppCliValues & {
  "process-file"?: string;
};

export function resolveProcessFilePath(
  cliValues: ProcessCliValues,
  app?: AppEntry,
): string {
  return (
    cliValues["process-file"] ??
    process.env.PROCESS_FILE_PATH ??
    (app ? `process/${app.name}.yaml` : "process.yaml")
  );
}

export function resolveProcessContainerConfig(
  cliValues: ProcessCliValues,
): ProcessManagementCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    processFilePath: resolveProcessFilePath(cliValues),
  };
}

export function resolveProcessAppContainerConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: ProcessCliValues,
): ProcessManagementCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    processFilePath: resolveProcessFilePath(cliValues, app),
  };
}
