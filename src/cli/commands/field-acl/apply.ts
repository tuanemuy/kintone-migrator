import { createFieldPermissionCliContainer } from "@/core/application/container/fieldPermissionCli";
import { applyFieldPermission } from "@/core/application/fieldPermission/applyFieldPermission";
import {
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../../fieldAclConfig";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply field access permissions from YAML to kintone app",
  args: fieldAclArgs,
  spinnerMessage: "Applying field access permissions...",
  spinnerStopMessage: "Field access permissions applied.",
  successMessage: "Field access permissions applied successfully.",
  createContainer: createFieldPermissionCliContainer,
  applyFn: applyFieldPermission,
  resolveContainerConfig: resolveFieldAclContainerConfig,
  resolveAppContainerConfig: resolveFieldAclAppContainerConfig,
});
