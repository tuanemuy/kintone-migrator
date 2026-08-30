import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import {
  createDumpCliContainer,
  type DumpCliContainerConfig,
} from "@/core/application/container/dumpCli";
import { dumpForm } from "@/core/application/formSchema/dumpForm";
import type { FormReadTarget } from "@/core/domain/formSchema/ports/formReadTarget";
import { kintoneArgs, multiAppArgs, resolveConfig } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import {
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../../projectConfig";
import { formReadTargetArgs, resolveFormReadTarget } from "./formReadTarget";

// The output file prefix and the generation actually read are both derived from
// the single `target` here, so no caller can write `published-fields.json` with
// preview content (or announce `fields.json` after writing the published one).
async function runSingleDump(
  config: Omit<DumpCliContainerConfig, "filePrefix">,
  basePrefix: string,
  target: FormReadTarget,
): Promise<void> {
  const filePrefix = `${basePrefix}${target === "published" ? "published-" : ""}`;
  const container = createDumpCliContainer({ ...config, filePrefix });

  const s = p.spinner();
  s.start(
    target === "published"
      ? "Fetching published form fields and layout..."
      : "Fetching form fields and layout...",
  );
  await dumpForm({ container, input: { target } });
  s.stop("Form data fetched.");

  p.log.success(
    `Saved ${pc.cyan(`${filePrefix}fields.json`)} and ${pc.cyan(`${filePrefix}layout.json`)}`,
  );
}

export default define({
  name: "dump",
  description: "Dump current kintone form fields and layout as JSON",
  args: { ...kintoneArgs, ...multiAppArgs, ...formReadTargetArgs },
  run: async (ctx) => {
    try {
      const target = resolveFormReadTarget(ctx.values);
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          const config = resolveConfig(ctx.values);
          await runSingleDump(
            {
              baseUrl: config.baseUrl,
              auth: config.auth,
              appId: config.appId,
              guestSpaceId: config.guestSpaceId,
            },
            "",
            target,
          );
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppCliConfig(app, projectConfig, ctx.values);
          await runSingleDump(
            {
              baseUrl: config.baseUrl,
              auth: config.auth,
              appId: config.appId,
              guestSpaceId: config.guestSpaceId,
            },
            `${app.name}-`,
            target,
          );
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
              printAppHeader(app.name, app.appId);
              await runSingleDump(
                {
                  baseUrl: config.baseUrl,
                  auth: config.auth,
                  appId: config.appId,
                  guestSpaceId: config.guestSpaceId,
                },
                `${app.name}-`,
                target,
              );
            },
            "All dumps completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
