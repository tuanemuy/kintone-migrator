import * as p from "@clack/prompts";
import { define } from "gunshi";
import { createCliContainer } from "@/core/application/container/cli";
import type { FormSchemaContainer } from "@/core/application/container/formSchema";
import {
  ConflictError,
  ConflictErrorCode,
  isConflictError,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import { pushSchema } from "@/core/application/formSchema/pushSchema";
import {
  confirmArgs,
  kintoneArgs,
  multiAppArgs,
  resolveConfig,
} from "../../config";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy } from "../../output";
import { resolveAppCliConfig, routeMultiApp } from "../../projectConfig";

// API optimistic-lock conflicts (applied just as the remote changed) are
// re-wrapped with a TOCTOU-specific message, distinct from the snapshot-drift
// rejection message (ADR-008).
const PUSH_TOCTOU_MESSAGE =
  "The remote changed while applying. Run `schema pull` and retry.";

async function runPush(
  container: FormSchemaContainer,
  force: boolean,
  skipConfirm: boolean,
): Promise<void> {
  if (!skipConfirm) {
    const shouldContinue = await p.confirm({
      message: force
        ? "Force-push local schema to kintone (overwrite remote)?"
        : "Push local schema to kintone?",
    });
    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel("Push cancelled.");
      return;
    }
  }

  const s = p.spinner();
  s.start("Pushing schema to kintone...");
  let result: Awaited<ReturnType<typeof pushSchema>>;
  try {
    result = await pushSchema({ container, input: { force } });
  } catch (error) {
    s.stop("Push failed.");
    // Distinguish API optimistic-lock (TOCTOU) conflicts from snapshot drift by
    // error code (ADR-008 / ADR-188-006): pushSchema tags snapshot drift with
    // ConfigDrift, while the kintone adapter uses Conflict for API 409
    // (revision) conflicts.
    if (
      isConflictError(error) &&
      error.code !== ConflictErrorCode.ConfigDrift
    ) {
      throw new ConflictError(
        ConflictErrorCode.Conflict,
        PUSH_TOCTOU_MESSAGE,
        error,
      );
    }
    throw error;
  }
  s.stop("Schema pushed to preview.");

  if (result.mode === "firstTime") {
    p.log.warn(
      "No base snapshot found. Applied without drift guard and initialized state.",
    );
  }
  p.log.success("Push completed successfully.");

  // confirmAndDeploy is intentionally outside the try above: a 409 during deploy
  // is a separate concurrency event from the push apply, so it should surface as
  // the adapter's standard ConflictError rather than be re-wrapped as a push
  // apply TOCTOU.
  await confirmAndDeploy([container], skipConfirm);
}

export default define({
  name: "push",
  description: "Push the local schema file to kintone (with drift detection)",
  args: {
    ...kintoneArgs,
    ...multiAppArgs,
    ...confirmArgs,
    force: {
      type: "boolean" as const,
      description: "Skip drift detection and overwrite remote",
    },
  },
  run: async (ctx) => {
    try {
      if (ctx.values.all === true) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          "schema push does not support --all yet. Use --app <name> or a single app.",
        );
      }

      const force = ctx.values.force === true;
      const skipConfirm = ctx.values.yes === true;

      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          const config = resolveConfig(ctx.values);
          const container = createCliContainer(config);
          await runPush(container, force, skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppCliConfig(app, projectConfig, ctx.values);
          const container = createCliContainer(config);
          await runPush(container, force, skipConfirm);
        },
        multiApp: async () => {
          throw new ValidationError(
            ValidationErrorCode.InvalidInput,
            "schema push does not support --all yet. Use --app <name> or a single app.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
