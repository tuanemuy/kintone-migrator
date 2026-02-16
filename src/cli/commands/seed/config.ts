import type { SeedCliContainerConfig } from "@/core/application/container/cli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { resolveConfig } from "../../config";
import {
  type MultiAppCliValues,
  resolveAppCliConfig,
} from "../../projectConfig";

export type SeedCliValues = MultiAppCliValues & {
  clean?: boolean;
  yes?: boolean;
  "key-field"?: string;
  "seed-file"?: string;
};

export function resolveSeedFilePath(
  cliValues: SeedCliValues,
  app?: AppEntry,
): string {
  return (
    cliValues["seed-file"] ??
    process.env.SEED_FILE_PATH ??
    app?.seedFile ??
    (app ? `seeds/${app.name}.yaml` : "seed.yaml")
  );
}

export function resolveSeedConfig(
  cliValues: SeedCliValues,
): SeedCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    seedFilePath: resolveSeedFilePath(cliValues),
  };
}

export function resolveSeedAppConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: SeedCliValues,
): SeedCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    seedFilePath: resolveSeedFilePath(cliValues, app),
  };
}
