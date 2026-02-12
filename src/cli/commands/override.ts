import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import { createCliContainer } from "@/core/application/container/cli";
import { forceOverrideForm } from "@/core/application/formSchema/forceOverrideForm";
import { kintoneArgs, resolveConfig } from "../config";
import { handleCliError } from "../handleError";
import { promptDeploy } from "../output";

export default define({
  name: "override",
  description: "Force override kintone form with declared schema",
  args: { ...kintoneArgs },
  run: async (ctx) => {
    try {
      const config = resolveConfig(ctx.values);
      const container = createCliContainer(config);

      p.log.warn(
        `${pc.bold(pc.red("WARNING:"))} This will replace the entire form with the declared schema.`,
      );
      p.log.warn("Fields not defined in the schema will be deleted.");

      const shouldContinue = await p.confirm({
        message: "Are you sure you want to force override?",
      });

      if (p.isCancel(shouldContinue) || !shouldContinue) {
        p.cancel("Force override cancelled.");
        process.exit(0);
      }

      const s = p.spinner();
      s.start("Force overriding form...");
      await forceOverrideForm({ container });
      s.stop("Force override applied.");

      p.log.success("Force override completed successfully.");

      await promptDeploy(container);
    } catch (error) {
      handleCliError(error);
    }
  },
});
