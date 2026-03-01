import { detectActionDiff } from "@/core/application/action/detectActionDiff";
import { createActionCliContainer } from "@/core/application/container/actionCli";
import {
  actionArgs,
  resolveActionAppContainerConfig,
  resolveActionContainerConfig,
} from "../../actionConfig";
import { printActionDiffResult } from "../../output";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description: "Compare local action config with remote kintone app",
  args: actionArgs,
  spinnerMessage: "Comparing action settings...",
  multiAppSuccessMessage: "All action diffs completed successfully.",
  createContainer: createActionCliContainer,
  detectDiff: detectActionDiff,
  printResult: printActionDiffResult,
  resolveContainerConfig: resolveActionContainerConfig,
  resolveAppContainerConfig: resolveActionAppContainerConfig,
});
