import { captureAction } from "@/core/application/action/captureAction";
import { saveAction } from "@/core/application/action/saveAction";
import { createActionCliContainer } from "@/core/application/container/actionCli";
import {
  actionArgs,
  resolveActionAppContainerConfig,
  resolveActionContainerConfig,
} from "../../actionConfig";
import { createCaptureCommand } from "../captureCommandFactory";

export default createCaptureCommand({
  description: "Capture current action settings from kintone app to file",
  args: actionArgs,
  spinnerMessage: "Capturing action settings...",
  spinnerStopMessage: "Action settings captured.",
  domainLabel: "Action settings",
  multiAppSuccessMessage: "All action captures completed successfully.",
  createContainer: createActionCliContainer,
  captureFn: captureAction,
  saveFn: saveAction,
  getConfigFilePath: (config) => config.actionFilePath,
  resolveContainerConfig: resolveActionContainerConfig,
  resolveAppContainerConfig: resolveActionAppContainerConfig,
});
