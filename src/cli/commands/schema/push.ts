import * as p from "@clack/prompts";
import { createCliContainer } from "@/core/application/container/cli";
import { pushSchema } from "@/core/application/formSchema/pushSchema";
import { kintoneArgs, multiAppArgs, resolveConfig } from "../../config";
import type { MultiAppCliValues } from "../../projectConfig";
import { resolveAppCliConfig } from "../../projectConfig";
import { createPushCommand } from "../pushCommandFactory";

// `force` is declared by the push factory; schema only supplies its container args.
const pushArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
};

/**
 * Schema push fits the generic push factory: single drift channel (snapshot
 * comparison), `ConfigDrift`-vs-TOCTOU re-wrap, and
 * per-app deploy are all handled by the factory. Only the container config
 * resolution differs (schema uses `resolveConfig` / `resolveAppCliConfig` rather
 * than a `createDomainConfigResolver`), supplied via the resolver hooks.
 */
export default createPushCommand({
  description: "Push the local schema file to kintone (with drift detection)",
  args: pushArgs,
  subject: "schema",
  spinnerStopMessage: "Schema pushed to preview.",
  createContainer: createCliContainer,
  pushFn: pushSchema,
  toctouMessage:
    "The remote changed while applying. Run `schema pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
  },
  resolveContainerConfig: (values: MultiAppCliValues) => resolveConfig(values),
  resolveAppContainerConfig: (app, projectConfig, values: MultiAppCliValues) =>
    resolveAppCliConfig(app, projectConfig, values),
});
