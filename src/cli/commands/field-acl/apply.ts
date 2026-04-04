import { createFieldPermissionCliContainer } from "@/core/application/container/fieldPermissionCli";
import { applyFieldPermission } from "@/core/application/fieldPermission/applyFieldPermission";
import { detectFieldPermissionDiff } from "@/core/application/fieldPermission/detectFieldPermissionDiff";
import {
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../../fieldAclConfig";
import { printFieldPermissionDiffResult } from "../../output";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply field access permissions from YAML to kintone app",
  args: fieldAclArgs,
  spinnerMessage: "Applying field access permissions...",
  spinnerStopMessage: "Field access permissions applied.",
  successMessage: "Field access permissions applied successfully.",
  createContainer: createFieldPermissionCliContainer,
  applyFn: applyFieldPermission,
  diffPreview: {
    detectDiff: detectFieldPermissionDiff,
    printResult: printFieldPermissionDiffResult,
  },
  resolveContainerConfig: resolveFieldAclContainerConfig,
  resolveAppContainerConfig: resolveFieldAclAppContainerConfig,
});
