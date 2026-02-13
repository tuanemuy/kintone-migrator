import { writeFile } from "node:fs/promises";
import * as p from "@clack/prompts";
import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { define } from "gunshi";
import pc from "picocolors";
import { buildKintoneAuth, kintoneArgs, resolveConfig } from "../config";
import { handleCliError } from "../handleError";

export default define({
  name: "dump",
  description: "Dump current kintone form fields and layout as JSON",
  args: { ...kintoneArgs },
  run: async (ctx) => {
    try {
      const config = resolveConfig(ctx.values);
      const client = new KintoneRestAPIClient({
        baseUrl: config.baseUrl,
        auth: buildKintoneAuth(config.auth),
        guestSpaceId: config.guestSpaceId,
      });

      const s = p.spinner();
      s.start("Fetching form fields and layout...");

      const [fields, layout] = await Promise.all([
        client.app.getFormFields({ app: config.appId }),
        client.app.getFormLayout({ app: config.appId }),
      ]);

      s.stop("Form data fetched.");

      await Promise.all([
        writeFile("fields.json", JSON.stringify(fields, null, 2)),
        writeFile("layout.json", JSON.stringify(layout, null, 2)),
      ]);

      p.log.success(
        `Saved ${pc.cyan("fields.json")} and ${pc.cyan("layout.json")}`,
      );
    } catch (error) {
      handleCliError(error);
    }
  },
});
