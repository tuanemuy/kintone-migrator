import { applyAction } from "@/core/application/action/applyAction";
import { detectActionDiff } from "@/core/application/action/detectActionDiff";
import { createActionCliContainer } from "@/core/application/container/actionCli";
import {
  actionArgs,
  resolveActionAppContainerConfig,
  resolveActionContainerConfig,
} from "../../actionConfig";
import { printActionDiffResult } from "../../output";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply action settings from YAML to kintone app",
  args: actionArgs,
  spinnerMessage: "Applying action settings...",
  spinnerStopMessage: "Action settings applied.",
  successMessage: "Action settings applied successfully.",
  createContainer: createActionCliContainer,
  applyFn: applyAction,
  diffPreview: {
    detectDiff: detectActionDiff,
    printResult: printActionDiffResult,
  },
  resolveContainerConfig: resolveActionContainerConfig,
  resolveAppContainerConfig: resolveActionAppContainerConfig,
});
