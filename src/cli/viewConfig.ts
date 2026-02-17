import type { ViewCliContainerConfig } from "@/core/application/container/viewCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";

export const viewArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "view-file": {
    type: "string" as const,
    description: "View file path (default: views.yaml)",
  },
};

export type ViewCliValues = MultiAppCliValues & {
  "view-file"?: string;
};

export function resolveViewFilePath(
  cliValues: ViewCliValues,
  app?: AppEntry,
): string {
  return (
    cliValues["view-file"] ??
    process.env.VIEW_FILE_PATH ??
    app?.viewFile ??
    (app ? `view/${app.name}.yaml` : "views.yaml")
  );
}

export function resolveViewContainerConfig(
  cliValues: ViewCliValues,
): ViewCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    viewFilePath: resolveViewFilePath(cliValues),
  };
}

export function resolveViewAppContainerConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: ViewCliValues,
): ViewCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    viewFilePath: resolveViewFilePath(cliValues, app),
  };
}
