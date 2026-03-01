import { createFieldPermissionCliContainer } from "@/core/application/container/fieldPermissionCli";
import { detectFieldPermissionDiff } from "@/core/application/fieldPermission/detectFieldPermissionDiff";
import {
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../../fieldAclConfig";
import { printFieldPermissionDiffResult } from "../../output";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description: "Compare local field permission config with remote kintone app",
  args: fieldAclArgs,
  spinnerMessage: "Comparing field permissions...",
  multiAppSuccessMessage: "All field permission diffs completed successfully.",
  createContainer: createFieldPermissionCliContainer,
  detectDiff: detectFieldPermissionDiff,
  printResult: printFieldPermissionDiffResult,
  resolveContainerConfig: resolveFieldAclContainerConfig,
  resolveAppContainerConfig: resolveFieldAclAppContainerConfig,
});
