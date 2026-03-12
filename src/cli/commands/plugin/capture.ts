import { createPluginCliContainer } from "@/core/application/container/pluginCli";
import { capturePlugin } from "@/core/application/plugin/capturePlugin";
import { savePlugin } from "@/core/application/plugin/savePlugin";
import {
  pluginArgs,
  resolvePluginAppContainerConfig,
  resolvePluginContainerConfig,
} from "../../pluginConfig";
import { createCaptureCommand } from "../captureCommandFactory";

export default createCaptureCommand({
  description: "Capture current plugins from kintone app to file",
  args: pluginArgs,
  spinnerMessage: "Capturing plugins...",
  spinnerStopMessage: "Plugins captured.",
  domainLabel: "Plugins",
  multiAppSuccessMessage: "All plugin captures completed successfully.",
  createContainer: createPluginCliContainer,
  captureFn: capturePlugin,
  saveFn: savePlugin,
  getConfigFilePath: (config) => config.pluginFilePath,
  resolveContainerConfig: resolvePluginContainerConfig,
  resolveAppContainerConfig: resolvePluginAppContainerConfig,
});
