import { createProcessManagementCliContainer } from "@/core/application/container/processManagementCli";
import { detectProcessManagementDiff } from "@/core/application/processManagement/detectProcessManagementDiff";
import { printProcessDiffResult } from "../../output";
import {
  processArgs,
  resolveProcessAppContainerConfig,
  resolveProcessContainerConfig,
} from "../../processConfig";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description:
    "Compare local process management settings with remote kintone app",
  args: processArgs,
  spinnerMessage: "Comparing process management settings...",
  multiAppSuccessMessage:
    "All process management diffs completed successfully.",
  createContainer: createProcessManagementCliContainer,
  detectDiff: detectProcessManagementDiff,
  printResult: printProcessDiffResult,
  resolveContainerConfig: resolveProcessContainerConfig,
  resolveAppContainerConfig: resolveProcessAppContainerConfig,
});
