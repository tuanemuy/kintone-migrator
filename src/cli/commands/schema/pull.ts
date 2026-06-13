import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import { createCliContainer } from "@/core/application/container/cli";
import type { FormSchemaContainer } from "@/core/application/container/formSchema";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import {
  applyPulledMerge,
  pullSchema,
} from "@/core/application/formSchema/pullSchema";
import type {
  FieldCode,
  FormSchemaThreeWayMerge,
  MergeResolution,
} from "@/core/domain/formSchema/valueObject";
import { kintoneArgs, multiAppArgs, resolveConfig } from "../../config";
import { handleCliError } from "../../handleError";
import { resolveAppCliConfig, routeMultiApp } from "../../projectConfig";

type PullOptions = {
  readonly force: boolean;
  readonly ours: boolean;
  readonly theirs: boolean;
};

// Result of conflict resolution; `undefined` means the user aborted (Ctrl-C).
async function resolveConflicts(
  merge: FormSchemaThreeWayMerge,
  options: PullOptions,
): Promise<MergeResolution | undefined> {
  const fields = new Map<FieldCode, "local" | "remote">();

  for (const conflict of merge.fieldConflicts) {
    let choice: "local" | "remote";
    if (options.ours) {
      choice = "local";
    } else if (options.theirs) {
      choice = "remote";
    } else {
      const selected = await p.select({
        message: `Conflict on field "${conflict.key}". Keep which side?`,
        options: [
          { value: "local", label: "local (ours)" },
          { value: "remote", label: "remote (theirs)" },
        ],
      });
      if (p.isCancel(selected)) {
        return undefined;
      }
      choice = selected as "local" | "remote";
    }
    fields.set(conflict.key, choice);
  }

  let layout: MergeResolution["layout"] = "noConflict";
  if (merge.layoutConflict) {
    if (options.ours) {
      layout = "local";
    } else if (options.theirs) {
      layout = "remote";
    } else {
      const selected = await p.select({
        message: "Conflict on layout. Keep which side?",
        options: [
          { value: "local", label: "local (ours)" },
          { value: "remote", label: "remote (theirs)" },
        ],
      });
      if (p.isCancel(selected)) {
        return undefined;
      }
      layout = selected as "local" | "remote";
    }
  }

  return { fields, layout };
}

async function runPull(
  container: FormSchemaContainer,
  schemaFilePath: string,
  options: PullOptions,
): Promise<void> {
  const s = p.spinner();
  s.start("Pulling schema from kintone...");
  const result = await pullSchema({
    container,
    input: { force: options.force },
  });
  s.stop("Schema pulled.");

  if (result.mode === "force") {
    p.log.success(
      `Local schema overwritten from remote: ${pc.cyan(schemaFilePath)}`,
    );
    return;
  }

  if (result.mode === "firstTime") {
    p.log.warn(
      "No base snapshot found. Initialized state from remote (one-way pull).",
    );
    p.log.success(`Local schema written: ${pc.cyan(schemaFilePath)}`);
    return;
  }

  // merged
  const { merge } = result;
  if (!merge.hasConflict) {
    const resolution: MergeResolution = {
      fields: new Map(),
      layout: "noConflict",
    };
    await applyPulledMerge({
      container,
      input: {
        merge,
        resolution,
        remoteRevision: result.remoteRevision,
        remoteSchema: result.remoteSchema,
      },
    });
    p.log.success(
      `Local schema merged and written: ${pc.cyan(schemaFilePath)}`,
    );
    return;
  }

  if (options.ours) {
    p.log.info("Resolving all conflicts in favor of local (--ours).");
  } else if (options.theirs) {
    p.log.info("Resolving all conflicts in favor of remote (--theirs).");
  }

  const resolution = await resolveConflicts(merge, options);
  if (resolution === undefined) {
    // Aborted: do not touch local YAML or state (AC-15).
    p.cancel("Pull cancelled. Local schema and state were left unchanged.");
    return;
  }

  await applyPulledMerge({
    container,
    input: {
      merge,
      resolution,
      remoteRevision: result.remoteRevision,
      remoteSchema: result.remoteSchema,
    },
  });
  p.log.success(
    `Conflicts resolved. Local schema written: ${pc.cyan(schemaFilePath)}`,
  );
}

export default define({
  name: "pull",
  description:
    "Pull remote form schema into the local schema file (3-way merge)",
  args: {
    ...kintoneArgs,
    ...multiAppArgs,
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
      if (ctx.values.all === true) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          "schema pull does not support --all yet. Use --app <name> or a single app.",
        );
      }

      const options: PullOptions = {
        force: ctx.values.force === true,
        ours: ctx.values.ours === true,
        theirs: ctx.values.theirs === true,
      };
      if (options.ours && options.theirs) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          "--ours and --theirs cannot be used together",
        );
      }

      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          const config = resolveConfig(ctx.values);
          const container = createCliContainer(config);
          await runPull(container, config.schemaFilePath, options);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppCliConfig(app, projectConfig, ctx.values);
          const container = createCliContainer(config);
          await runPull(container, config.schemaFilePath, options);
        },
        multiApp: async () => {
          throw new ValidationError(
            ValidationErrorCode.InvalidInput,
            "schema pull does not support --all yet. Use --app <name> or a single app.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
