import { createPluginCliContainer } from "@/core/application/container/pluginCli";
import { applyPlugin } from "@/core/application/plugin/applyPlugin";
import {
  pluginArgs,
  resolvePluginAppContainerConfig,
  resolvePluginContainerConfig,
} from "../../pluginConfig";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply plugins from YAML to kintone app",
  args: pluginArgs,
  spinnerMessage: "Applying plugins...",
  spinnerStopMessage: "Plugins applied.",
  successMessage: "Plugins applied successfully.",
  createContainer: createPluginCliContainer,
  applyFn: applyPlugin,
  resolveContainerConfig: resolvePluginContainerConfig,
  resolveAppContainerConfig: resolvePluginAppContainerConfig,
});
