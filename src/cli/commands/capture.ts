import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import { createCliContainer } from "@/core/application/container/cli";
import { captureSchema } from "@/core/application/formSchema/captureSchema";
import { saveSchema } from "@/core/application/formSchema/saveSchema";
import { kintoneArgs, resolveConfig } from "../config";
import { handleCliError } from "../handleError";

export default define({
  name: "capture",
  description: "Capture current kintone form schema to file",
  args: { ...kintoneArgs },
  run: async (ctx) => {
    try {
      const config = resolveConfig(ctx.values);
      const container = createCliContainer(config);

      const s = p.spinner();
      s.start("Capturing current form schema...");
      const result = await captureSchema({ container });
      s.stop("Form schema captured.");

      await saveSchema({
        container,
        input: { schemaText: result.schemaText },
      });

      p.log.success(`Schema saved to: ${pc.cyan(config.schemaFilePath)}`);

      if (result.hasExistingSchema) {
        p.log.warn("Existing schema was overwritten.");
      }
    } catch (error) {
      handleCliError(error);
    }
  },
});
