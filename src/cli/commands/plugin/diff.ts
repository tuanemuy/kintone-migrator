import { createPluginCliContainer } from "@/core/application/container/pluginCli";
import { detectPluginDiff } from "@/core/application/plugin/detectPluginDiff";
import { printPluginDiffResult } from "../../output";
import {
  pluginArgs,
  resolvePluginAppContainerConfig,
  resolvePluginContainerConfig,
} from "../../pluginConfig";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description: "Compare local plugin config with remote kintone app",
  args: pluginArgs,
  spinnerMessage: "Comparing plugin settings...",
  createContainer: createPluginCliContainer,
  detectDiff: detectPluginDiff,
  printResult: printPluginDiffResult,
  resolveContainerConfig: resolvePluginContainerConfig,
  resolveAppContainerConfig: resolvePluginAppContainerConfig,
});
