import { createViewCliContainer } from "@/core/application/container/viewCli";
import { captureView } from "@/core/application/view/captureView";
import { saveView } from "@/core/application/view/saveView";
import {
  resolveViewAppContainerConfig,
  resolveViewContainerConfig,
  viewArgs,
} from "../../viewConfig";
import { createCaptureCommand } from "../captureCommandFactory";

export default createCaptureCommand({
  description: "Capture current view settings from kintone app to file",
  args: viewArgs,
  deprecation: {
    commandName: "view capture",
    replacement: "view pull",
  },
  spinnerMessage: "Capturing views...",
  spinnerStopMessage: "Views captured.",
  domainLabel: "Views",
  multiAppSuccessMessage: "All view captures completed successfully.",
  createContainer: createViewCliContainer,
  captureFn: captureView,
  saveFn: saveView,
  getConfigFilePath: (config) => config.viewFilePath,
  resolveContainerConfig: resolveViewContainerConfig,
  resolveAppContainerConfig: resolveViewAppContainerConfig,
});
