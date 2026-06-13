import * as p from "@clack/prompts";
import { type Args, define } from "gunshi";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { handleCliError } from "../handleError";
import type { MultiAppCliValues } from "../projectConfig";
import { routeMultiApp } from "../projectConfig";

export type PullInput = {
  readonly force?: boolean;
};

/** Conflict resolution map: key → keep local (ours) or remote (theirs). */
export type ConflictResolution = Map<string, "local" | "remote">;

/**
 * The minimal merge shape the factory needs to drive conflict resolution. Each
 * conflict exposes a stable `key` used both as the prompt label and the
 * resolution map key.
 */
export type PullMergeView = {
  readonly hasConflict: boolean;
  readonly conflicts: readonly { readonly key: string }[];
};

/**
 * Discriminated result of a pull usecase's first stage (ADR-188-002). `merged`
 * carries the domain merge object `TMerged`; the factory reads its conflicts via
 * `getMergeView` and applies the resolution via `applyMerge`.
 */
export type PullResult<TMerged> =
  | { readonly mode: "force" }
  | { readonly mode: "firstTime" }
  | { readonly mode: "merged"; readonly merged: TMerged };

type PullOptions = {
  readonly force: boolean;
  readonly ours: boolean;
  readonly theirs: boolean;
};

type PullCommandConfig<
  TContainerConfig,
  TContainer,
  TCliValues extends MultiAppCliValues,
  TMerged,
> = {
  readonly description: string;
  readonly args: Args;
  /** Label used in spinner/log messages, e.g. "view config". */
  readonly subject: string;
  /** What a conflicting entity is called in prompts, e.g. "view". */
  readonly conflictNoun: string;
  readonly createContainer: (config: TContainerConfig) => TContainer;
  readonly pullFn: (args: {
    container: TContainer;
    input: PullInput;
  }) => Promise<PullResult<TMerged>>;
  /** Extracts the conflict-bearing view of a `merged` result. */
  readonly getMergeView: (merged: TMerged) => PullMergeView;
  /** Applies the resolved merge (second stage; never called when aborted). */
  readonly applyMerge: (args: {
    container: TContainer;
    merged: TMerged;
    resolution: ConflictResolution;
  }) => Promise<void>;
  readonly resolveContainerConfig: (values: TCliValues) => TContainerConfig;
  readonly resolveAppContainerConfig: (
    app: AppEntry,
    projectConfig: ProjectConfig,
    values: TCliValues,
  ) => TContainerConfig;
};

/**
 * Factory for `pull` commands (ADR-188-002).
 *
 * Absorbs the boilerplate shared by every config domain: the two-stage pull
 * (merge → CLI conflict resolution → apply, side-effect free when aborted —
 * AC-11), `--ours` / `--theirs` / interactive resolution, `--force`
 * (capture-equivalent overwrite), and the no-state first-run fallback. Domain
 * specifics (3-way merge, snapshot persistence) live in `pullFn` / `applyMerge`.
 * `routeMultiApp` is embedded; `--all` is rejected here and handled by ステップ 13.
 */
export function createPullCommand<
  TContainerConfig,
  TContainer,
  TCliValues extends MultiAppCliValues,
  TMerged,
>(
  config: PullCommandConfig<TContainerConfig, TContainer, TCliValues, TMerged>,
) {
  const notSupportedAll = new ValidationError(
    ValidationErrorCode.InvalidInput,
    `${config.description} does not support --all yet. Use --app <name> or a single app.`,
  );

  // Resolves every conflict to a side. Returns undefined when the user aborts
  // (Ctrl-C on an interactive prompt) so the caller leaves local/state intact.
  async function resolveConflicts(
    merge: PullMergeView,
    options: PullOptions,
  ): Promise<ConflictResolution | undefined> {
    const resolution: ConflictResolution = new Map();
    for (const conflict of merge.conflicts) {
      if (options.ours) {
        resolution.set(conflict.key, "local");
        continue;
      }
      if (options.theirs) {
        resolution.set(conflict.key, "remote");
        continue;
      }
      const selected = await p.select({
        message: `Conflict on ${config.conflictNoun} "${conflict.key}". Keep which side?`,
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
    containerConfig: TContainerConfig,
    options: PullOptions,
  ): Promise<void> {
    const container = config.createContainer(containerConfig);

    const s = p.spinner();
    s.start(`Pulling ${config.subject} from kintone...`);
    let result: PullResult<TMerged>;
    try {
      result = await config.pullFn({
        container,
        input: { force: options.force },
      });
    } catch (error) {
      s.stop("Pull failed.");
      throw error;
    }
    s.stop(`${capitalize(config.subject)} pulled.`);

    if (result.mode === "force") {
      p.log.success(`Local ${config.subject} overwritten from remote.`);
      return;
    }

    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Initialized state from remote (one-way pull).",
      );
      p.log.success(`Local ${config.subject} written.`);
      return;
    }

    const merge = config.getMergeView(result.merged);
    if (!merge.hasConflict) {
      await config.applyMerge({
        container,
        merged: result.merged,
        resolution: new Map(),
      });
      p.log.success(`Local ${config.subject} merged and written.`);
      return;
    }

    if (options.ours) {
      p.log.info("Resolving all conflicts in favor of local (--ours).");
    } else if (options.theirs) {
      p.log.info("Resolving all conflicts in favor of remote (--theirs).");
    }

    const resolution = await resolveConflicts(merge, options);
    if (resolution === undefined) {
      // Aborted: do not touch local YAML or state (AC-11).
      p.cancel(
        `Pull cancelled. Local ${config.subject} and state were left unchanged.`,
      );
      return;
    }

    await config.applyMerge({ container, merged: result.merged, resolution });
    p.log.success(`Conflicts resolved. Local ${config.subject} written.`);
  }

  return define({
    name: "pull",
    description: config.description,
    args: {
      ...config.args,
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
        const values = ctx.values as TCliValues;
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

        if (values.all === true) {
          throw notSupportedAll;
        }

        await routeMultiApp(values, {
          singleLegacy: async () => {
            await runPull(config.resolveContainerConfig(values), options);
          },
          singleApp: async (app, projectConfig) => {
            await runPull(
              config.resolveAppContainerConfig(app, projectConfig, values),
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
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
