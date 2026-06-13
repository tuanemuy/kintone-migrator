import * as p from "@clack/prompts";
import { createPluginCliContainer } from "@/core/application/container/pluginCli";
import { applyPlugin } from "@/core/application/plugin/applyPlugin";
import { detectPluginDiff } from "@/core/application/plugin/detectPluginDiff";
import { printPluginDiffResult } from "../../output";
import {
  pluginArgs,
  resolvePluginAppContainerConfig,
  resolvePluginContainerConfig,
} from "../../pluginConfig";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply plugins from YAML to kintone app",
  args: pluginArgs,
  deprecation: {
    commandName: "plugin apply",
    replacement: "plugin push",
  },
  spinnerMessage: "Applying plugins...",
  spinnerStopMessage: "Plugins applied.",
  successMessage: "Plugins applied successfully.",
  createContainer: createPluginCliContainer,
  applyFn: applyPlugin,
  onResult: (result) => {
    if (result.addedPluginIds.length > 0) {
      p.log.info(`Added plugins: ${result.addedPluginIds.join(", ")}`);
    }
    // enabled: false is inexpressible via the plugin API: there is no way to
    // add a plugin in a disabled state and no way to disable an existing one.
    // Surface these so they can be handled manually in the kintone admin UI.
    const disabled = result.skipped.map((s) => s.pluginId);
    if (disabled.length > 0) {
      p.log.warn(
        `enabled: false is not supported by the kintone plugin API (cannot add in a disabled state, cannot disable an existing plugin); not changed — handle these in the kintone admin UI: ${disabled.join(", ")}`,
      );
    }
  },
  diffPreview: {
    detectDiff: detectPluginDiff,
    printResult: printPluginDiffResult,
  },
  resolveContainerConfig: resolvePluginContainerConfig,
  resolveAppContainerConfig: resolvePluginAppContainerConfig,
});
