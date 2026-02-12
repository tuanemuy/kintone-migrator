import * as p from "@clack/prompts";
import { define } from "gunshi";
import { createCliContainer } from "@/core/application/container/cli";
import { detectDiff } from "@/core/application/formSchema/detectDiff";
import { executeMigration } from "@/core/application/formSchema/executeMigration";
import { kintoneArgs, resolveConfig } from "../config";
import { handleCliError } from "../handleError";
import { printDiffResult, promptDeploy } from "../output";

export default define({
  name: "migrate",
  description: "Apply schema changes to kintone form",
  args: { ...kintoneArgs },
  run: async (ctx) => {
    try {
      const config = resolveConfig(ctx.values);
      const container = createCliContainer(config);

      const s = p.spinner();
      s.start("Detecting changes...");
      const result = await detectDiff({ container });
      s.stop("Changes detected.");

      if (result.isEmpty) {
        p.log.success("No changes detected. Form is up to date.");
        return;
      }

      printDiffResult(result);

      const shouldContinue = await p.confirm({
        message: "Apply these changes?",
      });

      if (p.isCancel(shouldContinue) || !shouldContinue) {
        p.cancel("Migration cancelled.");
        process.exit(0);
      }

      const ms = p.spinner();
      ms.start("Applying migration...");
      await executeMigration({ container });
      ms.stop("Migration applied.");

      p.log.success("Migration completed successfully.");

      await promptDeploy(container);
    } catch (error) {
      handleCliError(error);
    }
  },
});
