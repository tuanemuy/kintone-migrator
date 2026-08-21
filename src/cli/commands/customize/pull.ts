import { dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  type CustomizationCliContainerConfig,
  createCustomizationCliContainer,
} from "@/core/application/container/cli";
import type { CustomizationContainer } from "@/core/application/container/customization";
import {
  applyPulledCustomizationMerge,
  type PullCustomizationOutput,
  pullCustomization,
} from "@/core/application/customization/pullCustomization";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import { SCOPE_KEY } from "@/core/domain/customization/services/customizationMerge";
import {
  type CustomizeCliValues,
  customizeArgs,
  resolveCustomizeAppConfig,
  resolveCustomizeConfig,
} from "../../customizeConfig";
import { handleCliError } from "../../handleError";
import { routeMultiApp } from "../../projectConfig";
import { computeBasePath, deriveFilePrefix } from "./capture";

type CustomizeMerged = Extract<PullCustomizationOutput, { mode: "merged" }>;

/**
 * Derives the path bases `runPull` feeds to the application layer.
 *
 * - `basePath` (= push's {@link computeBasePath}) is where merged/downloaded
 *   content resolves and push uploads from.
 * - `captureBasePath` + `filePrefix` are passed to the capture-equivalent
 *   (force / first-time) path.
 *
 * Invariant: `join(captureBasePath, filePrefix) === basePath`, so pull writes
 * exactly where push uploads from. Exported so the invariant test pins these
 * exact derivations rather than a hand-mirrored copy.
 */
export function derivePullPaths(customizeFilePath: string): {
  readonly basePath: string;
  readonly captureBasePath: string;
  readonly filePrefix: string;
} {
  return {
    basePath: computeBasePath(customizeFilePath),
    captureBasePath: dirname(resolve(customizeFilePath)),
    filePrefix: deriveFilePrefix(customizeFilePath),
  };
}

type PullOptions = {
  readonly force: boolean;
  readonly ours: boolean;
  readonly theirs: boolean;
};

/**
 * What each choice does. `pull` never writes to kintone, so the destruction is
 * one-directional: only the copy on disk can be lost here, and the wording says
 * which choice loses it.
 *
 * The scope is a single value in the customization config file, so no file moves
 * either way. A resource whose remote side is a URL — or gone — carries no body
 * to write over the local copy, hence "wherever the remote side has a body"
 * rather than a flat promise that the file on disk is replaced.
 */
const SCOPE_EFFECT =
  "remote takes the remote scope; local keeps the local one, and the remote stays untouched until the next `customize push`";
const RESOURCE_EFFECT =
  "remote replaces the local file on disk wherever the remote side has a body; local keeps the copy on disk, and the remote stays untouched until the next `customize push`";

/** The merge facts the prompt wording depends on. */
type ConflictContext = Pick<
  CustomizeMerged,
  "estimatedKeys" | "unreadableLocalKeys"
>;

/**
 * Why the divergence may not be real, when it may not be.
 *
 * An unreadable local file counts as unknown content, so it conflicts with any
 * remote change even where a baseline was recorded — a separate case from a
 * missing baseline, and the only one where picking `local` leaves the merge
 * pointing at a file that is not on disk.
 */
function conflictCaveat(
  context: ConflictContext,
  key: string,
): string | undefined {
  if (context.unreadableLocalKeys.has(key)) {
    return "the local file could not be read, so this may not be a real conflict";
  }
  if (context.estimatedKeys.conservative.has(key)) {
    return "no recorded baseline for this file, so this may not be a real conflict";
  }
  return undefined;
}

/**
 * The conflict prompt. Exported so its wording is pinned by a test: this prompt
 * is the only place where picking the wrong side discards content, and both the
 * caveat and the effect are chosen here.
 */
export function buildConflictPrompt(
  context: ConflictContext,
  key: string,
): string {
  const isScope = key === SCOPE_KEY;
  const effect = isScope ? SCOPE_EFFECT : RESOURCE_EFFECT;
  const caveat = conflictCaveat(context, key);
  const detail = caveat === undefined ? effect : `${caveat}; ${effect}`;
  const subject = isScope ? "scope" : `entry "${key}"`;
  return `Conflict on ${subject}. Keep which side? (${detail})`;
}

async function resolveConflicts(
  merged: CustomizeMerged,
  options: PullOptions,
): Promise<Map<string, "local" | "remote"> | undefined> {
  const resolution = new Map<string, "local" | "remote">();
  for (const conflict of merged.merge.conflicts) {
    if (options.ours) {
      resolution.set(conflict.key, "local");
      continue;
    }
    if (options.theirs) {
      resolution.set(conflict.key, "remote");
      continue;
    }
    const selected = await p.select({
      message: buildConflictPrompt(merged, conflict.key),
      options: [
        { value: "local", label: "local (ours)" },
        { value: "remote", label: "remote (theirs)" },
      ],
    });
    if (p.isCancel(selected)) {
      return undefined;
    }
    resolution.set(conflict.key, selected as "local" | "remote");
  }
  return resolution;
}

async function runPull(
  containerConfig: CustomizationCliContainerConfig,
  options: PullOptions,
): Promise<void> {
  const container: CustomizationContainer =
    createCustomizationCliContainer(containerConfig);
  const { basePath, captureBasePath, filePrefix } = derivePullPaths(
    containerConfig.customizeFilePath,
  );

  const s = p.spinner();
  s.start("Pulling customization from kintone...");
  let result: PullCustomizationOutput;
  try {
    result = await pullCustomization({
      container,
      input: { basePath, captureBasePath, filePrefix, force: options.force },
    });
  } catch (error) {
    s.stop("Pull failed.");
    throw error;
  }
  s.stop("Customization pulled.");

  if (result.mode === "force") {
    p.log.success("Local customization overwritten from remote.");
    return;
  }
  if (result.mode === "firstTime") {
    p.log.warn(
      "No base snapshot found. Initialized state from remote (one-way pull).",
    );
    p.log.success("Local customization written.");
    return;
  }

  if (!result.merge.hasConflict) {
    await applyPulledCustomizationMerge({
      container,
      input: {
        basePath,
        merge: result.merge,
        resolution: new Map(),
        local: result.local,
        remote: result.remote,
        remoteConfig: result.remoteConfig,
        remoteRevision: result.remoteRevision,
        remoteDigests: result.remoteDigests,
      },
    });
    p.log.success("Local customization merged and written.");
    return;
  }

  if (options.ours) {
    p.log.info("Resolving all conflicts in favor of local (--ours).");
  } else if (options.theirs) {
    p.log.info("Resolving all conflicts in favor of remote (--theirs).");
  }

  const resolution = await resolveConflicts(result, options);
  if (resolution === undefined) {
    p.cancel(
      "Pull cancelled. Local customization and state were left unchanged.",
    );
    return;
  }

  await applyPulledCustomizationMerge({
    container,
    input: {
      basePath,
      merge: result.merge,
      resolution,
      local: result.local,
      remote: result.remote,
      remoteConfig: result.remoteConfig,
      remoteRevision: result.remoteRevision,
      remoteDigests: result.remoteDigests,
    },
  });
  p.log.success("Conflicts resolved. Local customization written.");
}

export default define({
  name: "pull",
  description:
    "Pull remote customization into the local config (3-way merge, downloads files)",
  args: {
    ...customizeArgs,
    force: {
      type: "boolean" as const,
      description: "Overwrite local with remote (capture-equivalent)",
    },
    ours: {
      type: "boolean" as const,
      description: "Resolve all conflicts in favor of local",
    },
    theirs: {
      type: "boolean" as const,
      description: "Resolve all conflicts in favor of remote",
    },
  },
  run: async (ctx) => {
    try {
      const values = ctx.values as CustomizeCliValues;
      const options: PullOptions = {
        force: (ctx.values as { force?: boolean }).force === true,
        ours: (ctx.values as { ours?: boolean }).ours === true,
        theirs: (ctx.values as { theirs?: boolean }).theirs === true,
      };

      if (options.ours && options.theirs) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          "--ours and --theirs cannot be used together",
        );
      }

      const notSupportedAll = new ValidationError(
        ValidationErrorCode.InvalidInput,
        "customize pull does not support --all yet. Use --app <name> or a single app.",
      );
      if (values.all === true) {
        throw notSupportedAll;
      }

      await routeMultiApp(values, {
        singleLegacy: async () => {
          await runPull(resolveCustomizeConfig(values), options);
        },
        singleApp: async (app, projectConfig) => {
          await runPull(
            resolveCustomizeAppConfig(app, projectConfig, values),
            options,
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
