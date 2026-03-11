import { createFieldPermissionCliContainer } from "@/core/application/container/fieldPermissionCli";
import { captureFieldPermission } from "@/core/application/fieldPermission/captureFieldPermission";
import { saveFieldPermission } from "@/core/application/fieldPermission/saveFieldPermission";
import {
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../../fieldAclConfig";
import { createCaptureCommand } from "../captureCommandFactory";

export default createCaptureCommand({
  description:
    "Capture current field access permissions from kintone app to file",
  args: fieldAclArgs,
  spinnerMessage: "Capturing field access permissions...",
  spinnerStopMessage: "Field access permissions captured.",
  domainLabel: "Field ACL",
  multiAppSuccessMessage: "All field ACL captures completed successfully.",
  createContainer: createFieldPermissionCliContainer,
  captureFn: captureFieldPermission,
  saveFn: saveFieldPermission,
  getConfigFilePath: (config) => config.fieldAclFilePath,
  resolveContainerConfig: resolveFieldAclContainerConfig,
  resolveAppContainerConfig: resolveFieldAclAppContainerConfig,
});
