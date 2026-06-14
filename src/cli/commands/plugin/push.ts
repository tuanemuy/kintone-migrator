import * as p from "@clack/prompts";
import { createPluginCliContainer } from "@/core/application/container/pluginCli";
import { pushPlugin } from "@/core/application/plugin/pushPlugin";
import {
  pluginArgs,
  resolvePluginAppContainerConfig,
  resolvePluginContainerConfig,
} from "../../pluginConfig";
import { createPushCommand } from "../pushCommandFactory";

export default createPushCommand({
  description:
    "Push the local plugin config to kintone (add-only, with drift detection)",
  args: pluginArgs,
  subject: "plugin config",
  spinnerStopMessage: "Plugins pushed to preview.",
  createContainer: createPluginCliContainer,
  pushFn: pushPlugin,
  toctouMessage:
    "The remote changed while applying. Run `plugin pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
    if (result.addedPluginIds.length > 0) {
      p.log.info(`Added plugins: ${result.addedPluginIds.join(", ")}`);
    }
    // Add-only API: surface every operation that `addPlugins` could not
    // express. kintone has no remove API and cannot toggle `enabled` via REST.
    const deletions = result.skipped
      .filter((o) => o.reason === "delete")
      .map((o) => o.pluginId);
    const modifications = result.skipped
      .filter((o) => o.reason === "modify")
      .map((o) => o.pluginId);
    const addDisabled = result.skipped
      .filter((o) => o.reason === "add-disabled")
      .map((o) => o.pluginId);
    if (deletions.length > 0) {
      p.log.warn(
        `Cannot remove plugins via the kintone API (add-only); left on the app: ${deletions.join(", ")}`,
      );
    }
    if (modifications.length > 0) {
      p.log.warn(
        `Cannot modify existing plugins (name/enabled) via the kintone API (add-only); unchanged: ${modifications.join(", ")}`,
      );
    }
    if (addDisabled.length > 0) {
      p.log.warn(
        `Cannot add plugins in a disabled state via the kintone API (add-only; adding would force-enable them); not added — set enabled: false manually in the kintone admin UI: ${addDisabled.join(", ")}`,
      );
    }
  },
  resolveContainerConfig: resolvePluginContainerConfig,
  resolveAppContainerConfig: resolvePluginAppContainerConfig,
});
