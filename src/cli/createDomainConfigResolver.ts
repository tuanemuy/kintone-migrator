import type { KintoneAuth } from "@/core/application/container/cli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";
import { resolveFilePath } from "./resolveFilePath";

export type BaseContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
};

export function createDomainConfigResolver<
  TConfig extends BaseContainerConfig,
  TFileArgKey extends string,
  TValues extends MultiAppCliValues & { [K in TFileArgKey]?: string },
>(options: {
  fileArgKey: TFileArgKey;
  /** Thunk to defer env var evaluation from module load time to call time */
  envVar: () => string | undefined;
  appFileField: (app: AppEntry) => string | undefined;
  defaultDir: string;
  defaultFileName: string;
  buildConfig: (base: BaseContainerConfig, filePath: string) => TConfig;
}) {
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
    return options.buildConfig(
      {
        baseUrl: config.baseUrl,
        auth: config.auth,
        appId: config.appId,
        guestSpaceId: config.guestSpaceId,
      },
      resolveFilePath_(cliValues),
    );
  }

  function resolveAppContainerConfig(
    app: AppEntry,
    projectConfig: ProjectConfig,
    cliValues: TValues,
  ): TConfig {
    const config = resolveAppCliConfig(app, projectConfig, cliValues);
    return options.buildConfig(
      {
        baseUrl: config.baseUrl,
        auth: config.auth,
        appId: config.appId,
        guestSpaceId: config.guestSpaceId,
      },
      resolveFilePath_(cliValues, app),
    );
  }

  return {
    resolveFilePath: resolveFilePath_,
    resolveContainerConfig,
    resolveAppContainerConfig,
  };
}
