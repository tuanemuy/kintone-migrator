import type { KintoneAuth } from "@/core/application/container/cli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";
import { resolveFilePath } from "./resolveFilePath";

type BaseContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
};

export function createDomainConfigResolver<
  TFileArgKey extends string,
  TFilePathKey extends string,
  TValues extends MultiAppCliValues & { [K in TFileArgKey]?: string },
>(options: {
  fileArgKey: TFileArgKey;
  envVar: () => string | undefined;
  appFileField: (app: AppEntry) => string | undefined;
  defaultDir: string;
  defaultFileName: string;
  filePathKey: TFilePathKey;
}) {
  type TConfig = BaseContainerConfig & Record<TFilePathKey, string>;

  function resolveFilePath_(cliValues: TValues, app?: AppEntry): string {
    return resolveFilePath({
      cliValue: cliValues[options.fileArgKey],
      envVar: options.envVar(),
      appFileField: options.appFileField,
      app,
      defaultDir: options.defaultDir,
      defaultFileName: options.defaultFileName,
    });
  }

  function resolveContainerConfig(cliValues: TValues): TConfig {
    const config = resolveConfig(cliValues);
    return {
      baseUrl: config.baseUrl,
      auth: config.auth,
      appId: config.appId,
      guestSpaceId: config.guestSpaceId,
      [options.filePathKey]: resolveFilePath_(cliValues),
    } as TConfig;
  }

  function resolveAppContainerConfig(
    app: AppEntry,
    projectConfig: ProjectConfig,
    cliValues: TValues,
  ): TConfig {
    const config = resolveAppCliConfig(app, projectConfig, cliValues);
    return {
      baseUrl: config.baseUrl,
      auth: config.auth,
      appId: config.appId,
      guestSpaceId: config.guestSpaceId,
      [options.filePathKey]: resolveFilePath_(cliValues, app),
    } as TConfig;
  }

  return {
    resolveFilePath: resolveFilePath_,
    resolveContainerConfig,
    resolveAppContainerConfig,
  };
}
