import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import {
  createSeedCliContainer,
  type SeedCliContainerConfig,
} from "@/core/application/container/cli";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import {
  type CaptureSeedInput,
  captureSeed,
} from "@/core/application/seedData/captureSeed";
import { saveSeed } from "@/core/application/seedData/saveSeed";
import { upsertSeed } from "@/core/application/seedData/upsertSeed";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "../config";
import { handleCliError } from "../handleError";
import { printAppHeader } from "../output";
import {
  type MultiAppCliValues,
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../projectConfig";

const seedArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  capture: {
    type: "boolean" as const,
    description: "Capture records from kintone app to seed file",
  },
  "key-field": {
    type: "string" as const,
    short: "k",
    description: "Key field code for upsert (required for capture)",
  },
  "seed-file": {
    type: "string" as const,
    short: "s",
    description: "Seed file path (default: seed.yaml)",
  },
};

type SeedCliValues = MultiAppCliValues & {
  capture?: boolean;
  "key-field"?: string;
  "seed-file"?: string;
};

function resolveSeedFilePath(cliValues: SeedCliValues, app?: AppEntry): string {
  return (
    cliValues["seed-file"] ??
    process.env.SEED_FILE_PATH ??
    app?.seedFile ??
    (app ? `seeds/${app.name}.yaml` : "seed.yaml")
  );
}

function resolveSeedConfig(cliValues: SeedCliValues): SeedCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    seedFilePath: resolveSeedFilePath(cliValues),
  };
}

function resolveSeedAppConfig(
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

function printUpsertResult(result: {
  added: number;
  updated: number;
  unchanged: number;
  total: number;
}): void {
  const parts = [
    result.added > 0 ? pc.green(`+${result.added} added`) : null,
    result.updated > 0 ? pc.yellow(`~${result.updated} updated`) : null,
    result.unchanged > 0 ? `${result.unchanged} unchanged` : null,
  ]
    .filter(Boolean)
    .join(pc.dim("  |  "));

  p.log.info(`Records: ${parts} (${result.total} total)`);
}

async function runUpsert(config: SeedCliContainerConfig): Promise<void> {
  const container = createSeedCliContainer(config);

  const s = p.spinner();
  s.start("Applying seed data...");
  const result = await upsertSeed({ container });
  s.stop("Seed data applied.");

  printUpsertResult(result);
}

async function runSeedCapture(
  config: SeedCliContainerConfig,
  keyField: string,
): Promise<void> {
  const container = createSeedCliContainer(config);

  const s = p.spinner();
  s.start("Capturing records...");
  const result = await captureSeed({
    container,
    input: { keyField } satisfies CaptureSeedInput,
  });
  s.stop("Records captured.");

  await saveSeed({
    container,
    input: { seedText: result.seedText },
  });

  p.log.success(
    `Seed saved to: ${pc.cyan(config.seedFilePath)} (${result.recordCount} records)`,
  );

  if (result.hasExistingSeed) {
    p.log.warn("Existing seed file was overwritten.");
  }
}

async function runSeedOperation(
  config: SeedCliContainerConfig,
  isCapture: boolean,
  keyField?: string,
): Promise<void> {
  if (isCapture) {
    await runSeedCapture(config, keyField as string);
  } else {
    await runUpsert(config);
  }
}

export default define({
  name: "seed",
  description: "Apply or capture seed data (records) for kintone app",
  args: seedArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as SeedCliValues;
      const isCapture = values.capture === true;

      if (isCapture && !values["key-field"]) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          "--key-field is required when using --capture mode",
        );
      }

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveSeedConfig(values);
          await runSeedOperation(config, isCapture, values["key-field"]);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveSeedAppConfig(app, projectConfig, values);
          await runSeedOperation(config, isCapture, values["key-field"]);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveSeedAppConfig(app, projectConfig, values);
              printAppHeader(app.name, app.appId);
              await runSeedOperation(config, isCapture, values["key-field"]);
            },
            isCapture
              ? "All captures completed successfully."
              : "All seed applications completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
