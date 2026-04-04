import * as p from "@clack/prompts";
import { createProcessManagementCliContainer } from "@/core/application/container/processManagementCli";
import type { ApplyProcessManagementOutput } from "@/core/application/processManagement/applyProcessManagement";
import { applyProcessManagement } from "@/core/application/processManagement/applyProcessManagement";
import { detectProcessManagementDiff } from "@/core/application/processManagement/detectProcessManagementDiff";
import { printProcessDiffResult } from "../../output";
import {
  processArgs,
  resolveProcessAppContainerConfig,
  resolveProcessContainerConfig,
} from "../../processConfig";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand<
  Parameters<typeof createProcessManagementCliContainer>[0],
  ReturnType<typeof createProcessManagementCliContainer>,
  Parameters<typeof resolveProcessContainerConfig>[0],
  ApplyProcessManagementOutput
>({
  description: "Apply process management settings from YAML to kintone app",
  args: processArgs,
  spinnerMessage: "Applying process management settings...",
  spinnerStopMessage: "Process management settings applied.",
  successMessage: "Process management settings applied successfully.",
  createContainer: createProcessManagementCliContainer,
  applyFn: applyProcessManagement,
  onResult: (result) => {
    if (result.enableChanged) {
      p.log.warn(
        result.newEnable
          ? "Process management will be ENABLED. This activates workflow processing for this app."
          : "Process management will be DISABLED. This deactivates workflow processing for this app.",
      );
    }
  },
  diffPreview: {
    detectDiff: detectProcessManagementDiff,
    printResult: printProcessDiffResult,
  },
  resolveContainerConfig: resolveProcessContainerConfig,
  resolveAppContainerConfig: resolveProcessAppContainerConfig,
});
