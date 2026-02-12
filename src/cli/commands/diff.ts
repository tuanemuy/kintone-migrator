import * as p from "@clack/prompts";
import { define } from "gunshi";
import { createCliContainer } from "@/core/application/container/cli";
import { detectDiff } from "@/core/application/formSchema/detectDiff";
import { kintoneArgs, resolveConfig } from "../config";
import { handleCliError } from "../handleError";
import { printDiffResult } from "../output";

export default define({
  name: "diff",
  description:
    "Detect differences between schema file and current kintone form",
  args: { ...kintoneArgs },
  run: async (ctx) => {
    try {
      const config = resolveConfig(ctx.values);
      const container = createCliContainer(config);

      const s = p.spinner();
      s.start("Fetching form schema...");
      const result = await detectDiff({ container });
      s.stop("Form schema fetched.");

      printDiffResult(result);
    } catch (error) {
      handleCliError(error);
    }
  },
});
