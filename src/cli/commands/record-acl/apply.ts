import { createRecordPermissionCliContainer } from "@/core/application/container/recordPermissionCli";
import { applyRecordPermission } from "@/core/application/recordPermission/applyRecordPermission";
import {
  recordAclArgs,
  resolveRecordAclAppContainerConfig,
  resolveRecordAclContainerConfig,
} from "../../recordAclConfig";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply record access permissions from YAML to kintone app",
  args: recordAclArgs,
  spinnerMessage: "Applying record access permissions...",
  spinnerStopMessage: "Record access permissions applied.",
  successMessage: "Record access permissions applied successfully.",
  createContainer: createRecordPermissionCliContainer,
  applyFn: applyRecordPermission,
  resolveContainerConfig: resolveRecordAclContainerConfig,
  resolveAppContainerConfig: resolveRecordAclAppContainerConfig,
});
