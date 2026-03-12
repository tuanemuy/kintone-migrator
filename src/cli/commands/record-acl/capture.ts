import { createRecordPermissionCliContainer } from "@/core/application/container/recordPermissionCli";
import { captureRecordPermission } from "@/core/application/recordPermission/captureRecordPermission";
import { saveRecordPermission } from "@/core/application/recordPermission/saveRecordPermission";
import {
  recordAclArgs,
  resolveRecordAclAppContainerConfig,
  resolveRecordAclContainerConfig,
} from "../../recordAclConfig";
import { createCaptureCommand } from "../captureCommandFactory";

export default createCaptureCommand({
  description:
    "Capture current record access permissions from kintone app to file",
  args: recordAclArgs,
  spinnerMessage: "Capturing record access permissions...",
  spinnerStopMessage: "Record access permissions captured.",
  domainLabel: "Record ACL",
  multiAppSuccessMessage: "All record ACL captures completed successfully.",
  createContainer: createRecordPermissionCliContainer,
  captureFn: captureRecordPermission,
  saveFn: saveRecordPermission,
  getConfigFilePath: (config) => config.recordAclFilePath,
  resolveContainerConfig: resolveRecordAclContainerConfig,
  resolveAppContainerConfig: resolveRecordAclAppContainerConfig,
});
