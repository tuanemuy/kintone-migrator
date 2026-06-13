import * as p from "@clack/prompts";
import { type CommandContext, define } from "gunshi";
import pc from "picocolors";
import {
  createSeedCliContainer,
  type SeedCliContainerConfig,
} from "@/core/application/container/cli";
import { upsertSeed } from "@/core/application/seedData/upsertSeed";
import { confirmArgs, kintoneArgs, multiAppArgs } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  resolveSeedAppConfig,
  resolveSeedConfig,
  type SeedCliValues,
} from "./config";

export const seedPushArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  ...confirmArgs,
  clean: {
    type: "boolean" as const,
    description:
      "Delete all existing records before upserting seed data (clean push)",
  },
  "seed-file": {
    type: "string" as const,
    short: "s",
    description: "Seed file path (default: seed.yaml)",
  },
};

function printUpsertResult(result: {
  added: number;
  updated: number;
  unchanged: number;
  deleted: number;
  total: number;
}): void {
  const parts = [
    result.deleted > 0 ? pc.red(`-${result.deleted} deleted`) : null,
    result.added > 0 ? pc.green(`+${result.added} added`) : null,
    result.updated > 0 ? pc.yellow(`~${result.updated} updated`) : null,
    result.unchanged > 0 ? `${result.unchanged} unchanged` : null,
  ]
    .filter(Boolean)
    .join(pc.dim("  |  "));

  p.log.info(`Records: ${parts} (${result.total} total)`);
}

async function confirmClean(
  skipConfirm: boolean,
  showWarning = true,
): Promise<boolean> {
  if (showWarning) {
    p.log.warn(
      `${pc.bold(pc.red("WARNING:"))} This will delete ALL existing records before upserting seed data.`,
    );
  }

  if (!skipConfirm) {
    const shouldContinue = await p.confirm({
      message: "Are you sure you want to clean and re-push seed data?",
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel("Clean seed cancelled.");
      return false;
    }
  }

  return true;
}

async function runUpsert(
  config: SeedCliContainerConfig,
  clean: boolean,
  skipConfirm: boolean,
  showWarning = true,
): Promise<void> {
  if (clean) {
    const confirmed = await confirmClean(skipConfirm, showWarning);
    if (!confirmed) return;
  }

  const container = createSeedCliContainer(config);

  const s = p.spinner();
  s.start(
    clean ? "Cleaning and upserting seed data..." : "Upserting seed data...",
  );
  const result = await upsertSeed({ container, input: { clean } });
  s.stop(clean ? "Clean seed upserted." : "Seed data upserted.");

  printUpsertResult(result);
}

/**
 * Shared `run` body for `seed push` and its `seed apply` deprecation alias. seed
 * is out of scope for 3-way merge; this performs a plain upsert without the drift
 * guard the other domains' push commands apply.
 */
export async function runSeedPush(ctx: CommandContext): Promise<void> {
  try {
    const values = ctx.values as SeedCliValues;
    const clean = values.clean === true;
    const skipConfirm = values.yes === true;

    await routeMultiApp(values, {
      singleLegacy: async () => {
        const config = resolveSeedConfig(values);
        await runUpsert(config, clean, skipConfirm);
      },
      singleApp: async (app, projectConfig) => {
        const config = resolveSeedAppConfig(app, projectConfig, values);
        await runUpsert(config, clean, skipConfirm);
      },
      multiApp: async (plan, projectConfig) => {
        if (clean) {
          const confirmed = await confirmClean(skipConfirm);
          if (!confirmed) return;
        }

        await runMultiAppWithFailCheck(
          plan,
          async (app) => {
            const config = resolveSeedAppConfig(app, projectConfig, values);
            printAppHeader(app.name, app.appId);
            await runUpsert(config, clean, true, false);
          },
          "All seed pushes completed successfully.",
        );
      },
    });
  } catch (error) {
    handleCliError(error);
  }
}

export default define({
  name: "push",
  description:
    "Push seed data (records) to kintone app. seed is out of scope for 3-way merge: this is a plain upsert with no drift guard.",
  args: seedPushArgs,
  run: runSeedPush,
});
