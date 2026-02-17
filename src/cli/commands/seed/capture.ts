import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import {
  createSeedCliContainer,
  type SeedCliContainerConfig,
} from "@/core/application/container/cli";
import {
  type CaptureSeedInput,
  captureSeed,
} from "@/core/application/seedData/captureSeed";
import { saveSeed } from "@/core/application/seedData/saveSeed";
import { kintoneArgs, multiAppArgs } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  resolveSeedAppConfig,
  resolveSeedConfig,
  type SeedCliValues,
} from "./config";

const seedCaptureArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "key-field": {
    type: "string" as const,
    short: "k",
    description: "Key field code for upsert (optional, omit for add-only)",
  },
  "seed-file": {
    type: "string" as const,
    short: "s",
    description: "Seed file path (default: seed.yaml)",
  },
};

async function runSeedCapture(
  config: SeedCliContainerConfig,
  keyField: string | undefined,
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

  if (!keyField) {
    p.log.info("No key field specified. All records will be added on apply.");
  }

  if (result.hasExistingSeed) {
    p.log.warn("Existing seed file was overwritten.");
  }
}

export default define({
  name: "capture",
  description: "Capture records from kintone app to seed file",
  args: seedCaptureArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as SeedCliValues;
      const keyField = values["key-field"];

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveSeedConfig(values);
          await runSeedCapture(config, keyField);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveSeedAppConfig(app, projectConfig, values);
          await runSeedCapture(config, keyField);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveSeedAppConfig(app, projectConfig, values);
              printAppHeader(app.name, app.appId);
              await runSeedCapture(config, keyField);
            },
            "All captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
