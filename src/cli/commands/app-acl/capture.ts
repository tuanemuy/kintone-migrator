import { captureAppPermission } from "@/core/application/appPermission/captureAppPermission";
import { saveAppPermission } from "@/core/application/appPermission/saveAppPermission";
import { createAppPermissionCliContainer } from "@/core/application/container/appPermissionCli";
import {
  appAclArgs,
  resolveAppAclAppContainerConfig,
  resolveAppAclContainerConfig,
} from "../../appAclConfig";
import { createCaptureCommand } from "../captureCommandFactory";

export default createCaptureCommand({
  description:
    "Capture current app access permissions from kintone app to file",
  args: appAclArgs,
  spinnerMessage: "Capturing app access permissions...",
  spinnerStopMessage: "App access permissions captured.",
  domainLabel: "App ACL",
  multiAppSuccessMessage: "All app ACL captures completed successfully.",
  createContainer: createAppPermissionCliContainer,
  captureFn: captureAppPermission,
  saveFn: saveAppPermission,
  getConfigFilePath: (config) => config.appAclFilePath,
  resolveContainerConfig: resolveAppAclContainerConfig,
  resolveAppContainerConfig: resolveAppAclAppContainerConfig,
});
