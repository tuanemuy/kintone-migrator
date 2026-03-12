import { applyAction } from "@/core/application/action/applyAction";
import { createActionCliContainer } from "@/core/application/container/actionCli";
import {
  actionArgs,
  resolveActionAppContainerConfig,
  resolveActionContainerConfig,
} from "../../actionConfig";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply action settings from YAML to kintone app",
  args: actionArgs,
  spinnerMessage: "Applying action settings...",
  spinnerStopMessage: "Action settings applied.",
  successMessage: "Action settings applied successfully.",
  createContainer: createActionCliContainer,
  applyFn: applyAction,
  resolveContainerConfig: resolveActionContainerConfig,
  resolveAppContainerConfig: resolveActionAppContainerConfig,
});
