import { createRecordPermissionCliContainer } from "@/core/application/container/recordPermissionCli";
import { detectRecordPermissionDiff } from "@/core/application/recordPermission/detectRecordPermissionDiff";
import { printRecordPermissionDiffResult } from "../../output";
import {
  recordAclArgs,
  resolveRecordAclAppContainerConfig,
  resolveRecordAclContainerConfig,
} from "../../recordAclConfig";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description: "Compare local record permission config with remote kintone app",
  args: recordAclArgs,
  spinnerMessage: "Comparing record permissions...",
  multiAppSuccessMessage: "All record permission diffs completed successfully.",
  createContainer: createRecordPermissionCliContainer,
  detectDiff: detectRecordPermissionDiff,
  printResult: printRecordPermissionDiffResult,
  resolveContainerConfig: resolveRecordAclContainerConfig,
  resolveAppContainerConfig: resolveRecordAclAppContainerConfig,
});
