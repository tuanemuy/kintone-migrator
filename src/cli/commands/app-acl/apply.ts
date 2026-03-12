import { applyAppPermission } from "@/core/application/appPermission/applyAppPermission";
import { createAppPermissionCliContainer } from "@/core/application/container/appPermissionCli";
import {
  appAclArgs,
  resolveAppAclAppContainerConfig,
  resolveAppAclContainerConfig,
} from "../../appAclConfig";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply app access permissions from YAML to kintone app",
  args: appAclArgs,
  spinnerMessage: "Applying app access permissions...",
  spinnerStopMessage: "App access permissions applied.",
  successMessage: "App access permissions applied successfully.",
  createContainer: createAppPermissionCliContainer,
  applyFn: applyAppPermission,
  resolveContainerConfig: resolveAppAclContainerConfig,
  resolveAppContainerConfig: resolveAppAclAppContainerConfig,
});
