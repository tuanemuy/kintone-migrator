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
    // A conservatively estimated key has no recorded baseline, so "both sides
    // changed" is a guess — the file may not diverge at all (e.g. the local
    // copy could not be read). This prompt is the only place where picking the
    // wrong side actually discards content, so say so before asking.
    const estimated = merged.estimatedKeys.conservative.has(conflict.key);
    const message = estimated
      ? `Conflict on file "${conflict.key}". Keep which side? (estimated: no recorded baseline for this file, so this may not be a real conflict — the side you drop is overwritten)`
      : `Conflict on file "${conflict.key}". Keep which side?`;
    const selected = await p.select({
      message,
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
  // basePath: where local resource paths resolve (push-symmetric).
  // captureBasePath/filePrefix: capture-equivalent bases (prefix isolates per app).
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
