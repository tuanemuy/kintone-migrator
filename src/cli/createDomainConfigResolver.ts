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

/**
 * Factory that eliminates per-domain boilerplate for CLI config resolution.
 *
 * Returns three functions — `resolveFilePath`, `resolveContainerConfig`, and
 * `resolveAppContainerConfig` — whose behavior is driven by the supplied
 * domain-specific options.
 *
 * `envVar` is a thunk (not a plain value) so that `process.env` look-ups
 * happen at call time rather than at module-load time, which keeps tests
 * deterministic and respects runtime env overrides.
 */
export function createDomainConfigResolver<
  TConfig extends BaseContainerConfig,
  TFileArgKey extends string,
>(options: {
  fileArgKey: TFileArgKey;
  envVar: () => string | undefined;
  appFileField: (app: AppEntry) => string | undefined;
  defaultDir: string;
  defaultFileName: string;
  buildConfig: (base: BaseContainerConfig, filePath: string) => TConfig;
}) {
  type Values = MultiAppCliValues & Partial<Record<TFileArgKey, string>>;

  function resolveDomainFilePath(cliValues: Values, app?: AppEntry): string {
    return resolveFilePath({
      cliValue: cliValues[options.fileArgKey],
      envVar: options.envVar(),
      appFileField: options.appFileField,
      app,
      defaultDir: options.defaultDir,
      defaultFileName: options.defaultFileName,
    });
  }

  function resolveContainerConfig(cliValues: Values): TConfig {
    const config = resolveConfig(cliValues);
    // Intentionally picks only base fields; excludes schemaFilePath from CliConfig
    return options.buildConfig(
      {
        baseUrl: config.baseUrl,
        auth: config.auth,
        appId: config.appId,
        guestSpaceId: config.guestSpaceId,
      },
      resolveDomainFilePath(cliValues),
    );
  }

  function resolveAppContainerConfig(
    app: AppEntry,
    projectConfig: ProjectConfig,
    cliValues: Values,
  ): TConfig {
    const config = resolveAppCliConfig(app, projectConfig, cliValues);
    // Intentionally picks only base fields; excludes schemaFilePath from CliConfig
    return options.buildConfig(
      {
        baseUrl: config.baseUrl,
        auth: config.auth,
        appId: config.appId,
        guestSpaceId: config.guestSpaceId,
      },
      resolveDomainFilePath(cliValues, app),
    );
  }

  return {
    resolveFilePath: resolveDomainFilePath,
    resolveContainerConfig,
    resolveAppContainerConfig,
  };
}
