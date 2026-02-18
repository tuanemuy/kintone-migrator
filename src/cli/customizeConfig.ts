import type { CustomizationCliContainerConfig } from "@/core/application/container/cli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";
import { resolveFilePath } from "./resolveFilePath";

export const customizeArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "customize-file": {
    type: "string" as const,
    description: "Customization config file path (default: customize.yaml)",
  },
};

export type CustomizeCliValues = MultiAppCliValues & {
  "customize-file"?: string;
};

export function resolveCustomizeFilePath(
  cliValues: CustomizeCliValues,
  app?: AppEntry,
): string {
  return resolveFilePath({
    cliValue: cliValues["customize-file"],
    envVar: process.env.CUSTOMIZE_FILE_PATH,
    appFileField: (a) => a.customizeFile,
    app,
    defaultDir: "customize",
    defaultFileName: "customize.yaml",
  });
}

export function resolveCustomizeConfig(
  cliValues: CustomizeCliValues,
): CustomizationCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    customizeFilePath: resolveCustomizeFilePath(cliValues),
  };
}

export function resolveCustomizeAppConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: CustomizeCliValues,
): CustomizationCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    customizeFilePath: resolveCustomizeFilePath(cliValues, app),
  };
}
