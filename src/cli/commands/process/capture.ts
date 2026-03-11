import { createProcessManagementCliContainer } from "@/core/application/container/processManagementCli";
import { captureProcessManagement } from "@/core/application/processManagement/captureProcessManagement";
import { saveProcessManagement } from "@/core/application/processManagement/saveProcessManagement";
import {
  processArgs,
  resolveProcessAppContainerConfig,
  resolveProcessContainerConfig,
} from "../../processConfig";
import { createCaptureCommand } from "../captureCommandFactory";

export default createCaptureCommand({
  description:
    "Capture current process management settings from kintone app to file",
  args: processArgs,
  spinnerMessage: "Capturing process management settings...",
  spinnerStopMessage: "Process management settings captured.",
  domainLabel: "Process management settings",
  multiAppSuccessMessage:
    "All process management captures completed successfully.",
  createContainer: createProcessManagementCliContainer,
  captureFn: captureProcessManagement,
  saveFn: saveProcessManagement,
  getConfigFilePath: (config) => config.processFilePath,
  resolveContainerConfig: resolveProcessContainerConfig,
  resolveAppContainerConfig: resolveProcessAppContainerConfig,
});
