import { detectAppPermissionDiff } from "@/core/application/appPermission/detectAppPermissionDiff";
import { createAppPermissionCliContainer } from "@/core/application/container/appPermissionCli";
import {
  appAclArgs,
  resolveAppAclAppContainerConfig,
  resolveAppAclContainerConfig,
} from "../../appAclConfig";
import { printAppPermissionDiffResult } from "../../output";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description: "Compare local app permission config with remote kintone app",
  args: appAclArgs,
  spinnerMessage: "Comparing app permissions...",
  multiAppSuccessMessage: "All app permission diffs completed successfully.",
  createContainer: createAppPermissionCliContainer,
  detectDiff: detectAppPermissionDiff,
  printResult: printAppPermissionDiffResult,
  resolveContainerConfig: resolveAppAclContainerConfig,
  resolveAppContainerConfig: resolveAppAclAppContainerConfig,
});
