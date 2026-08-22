import * as p from "@clack/prompts";
import { define } from "gunshi";
import { createCliContainer } from "@/core/application/container/cli";
import type { FormSchemaContainer } from "@/core/application/container/formSchema";
import { detectDiff } from "@/core/application/formSchema/detectDiff";
import { detectThreeWayDiff } from "@/core/application/formSchema/detectThreeWayDiff";
import type { FormReadTarget } from "@/core/domain/formSchema/ports/formReadTarget";
import { kintoneArgs, multiAppArgs, resolveConfig } from "../../config";
import { handleCliError } from "../../handleError";
import {
  printAppHeader,
  printDiffResult,
  printSchemaDiffTarget,
  printThreeWayDiffResult,
} from "../../output";
import {
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../../projectConfig";
import { formReadTargetArgs, resolveFormReadTarget } from "./formReadTarget";

// The published comparison is deliberately 2-way: the base snapshot is a
// preview-generation record, so feeding published into the 3-way vocabulary
// would report undeployed changes as "remote drift".
// The spinner lifecycle stays in one place so neither branch can leave it
// spinning; only the use case and the printer differ by target.
async function runDiff(
  container: FormSchemaContainer,
  target: FormReadTarget,
): Promise<void> {
  printSchemaDiffTarget(target);

  const s = p.spinner();
  s.start("Comparing schema...");
  let result:
    | { kind: "published"; value: Awaited<ReturnType<typeof detectDiff>> }
    | {
        kind: "preview";
        value: Awaited<ReturnType<typeof detectThreeWayDiff>>;
      };
  try {
    result =
      target === "published"
        ? {
            kind: "published",
            value: await detectDiff({ container, input: { target } }),
          }
        : { kind: "preview", value: await detectThreeWayDiff({ container }) };
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  if (result.kind === "published") {
    printDiffResult(result.value);
    return;
  }
  printThreeWayDiffResult(result.value, printDiffResult);
}

export default define({
  name: "diff",
  description:
    "Detect differences between schema file and current kintone form",
  args: { ...kintoneArgs, ...multiAppArgs, ...formReadTargetArgs },
  run: async (ctx) => {
    try {
      const target = resolveFormReadTarget(ctx.values);
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          const config = resolveConfig(ctx.values);
          const container = createCliContainer(config);
          await runDiff(container, target);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppCliConfig(app, projectConfig, ctx.values);
          const container = createCliContainer(config);
          await runDiff(container, target);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveAppCliConfig(
                app,
                projectConfig,
                ctx.values,
              );
              const container = createCliContainer(config);
              printAppHeader(app.name, app.appId);
              await runDiff(container, target);
            },
            "All schema diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
