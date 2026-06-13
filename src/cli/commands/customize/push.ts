import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  type CustomizationCliContainerConfig,
  createCustomizationCliContainer,
} from "@/core/application/container/cli";
import { pushCustomization } from "@/core/application/customization/pushCustomization";
import {
  ConflictError,
  ConflictErrorCode,
  isConflictError,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import { confirmArgs, type WithConfirm } from "../../config";
import {
  type CustomizeCliValues,
  customizeArgs,
  resolveCustomizeAppConfig,
  resolveCustomizeConfig,
} from "../../customizeConfig";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy } from "../../output";
import { routeMultiApp } from "../../projectConfig";
import { computeBasePath } from "./capture";

const TOCTOU_MESSAGE =
  "The remote changed while applying. Run `customize pull` and retry.";

/**
 * Hand-written push command for customization (ADR-188-002): the file-entity
 * domain needs a `basePath` for file uploads, which the generic
 * `createPushCommand` does not thread through, so this mirrors the factory's
 * confirm + drift/TOCTOU re-wrap + per-app deploy locally.
 */
async function runPush(
  containerConfig: CustomizationCliContainerConfig,
  force: boolean,
  skipConfirm: boolean,
): Promise<void> {
  if (!skipConfirm) {
    const shouldContinue = await p.confirm({
      message: force
        ? "Force-push local customization to kintone (overwrite remote)?"
        : "Push local customization to kintone?",
    });
    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel("Push cancelled.");
      return;
    }
  }

  const container = createCustomizationCliContainer(containerConfig);
  const basePath = computeBasePath(containerConfig.customizeFilePath);

  const s = p.spinner();
  s.start("Pushing customization to kintone...");
  let result: Awaited<ReturnType<typeof pushCustomization>>;
  try {
    result = await pushCustomization({ container, input: { basePath, force } });
  } catch (error) {
    s.stop("Push failed.");
    if (
      isConflictError(error) &&
      error.code !== ConflictErrorCode.ConfigDrift
    ) {
      throw new ConflictError(
        ConflictErrorCode.Conflict,
        TOCTOU_MESSAGE,
        error,
      );
    }
    throw error;
  }
  s.stop("Customization pushed to preview.");

  if (result.mode === "firstTime") {
    p.log.warn(
      "No base snapshot found. Applied without drift guard and initialized state.",
    );
  }
  p.log.success("Push completed successfully.");

  await confirmAndDeploy([container], skipConfirm);
}

export default define({
  name: "push",
  description:
    "Push the local customization config to kintone (with drift detection)",
  args: { ...customizeArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as WithConfirm<CustomizeCliValues>;
      const force = (ctx.values as { force?: boolean }).force === true;
      const skipConfirm = values.yes === true;

      const notSupportedAll = new ValidationError(
        ValidationErrorCode.InvalidInput,
        "customize push does not support --all yet. Use --app <name> or a single app.",
      );
      if (values.all === true) {
        throw notSupportedAll;
      }

      await routeMultiApp(values, {
        singleLegacy: async () => {
          await runPush(resolveCustomizeConfig(values), force, skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          await runPush(
            resolveCustomizeAppConfig(app, projectConfig, values),
            force,
            skipConfirm,
          );
        },
        multiApp: async () => {
          throw notSupportedAll;
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
