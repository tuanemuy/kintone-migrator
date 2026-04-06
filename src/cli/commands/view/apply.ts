import * as p from "@clack/prompts";
import { createViewCliContainer } from "@/core/application/container/viewCli";
import type { ApplyViewOutput } from "@/core/application/view/applyView";
import { applyView } from "@/core/application/view/applyView";
import { detectViewDiff } from "@/core/application/view/detectViewDiff";
import { printViewDiffResult } from "../../output";
import {
  resolveViewAppContainerConfig,
  resolveViewContainerConfig,
  viewArgs,
} from "../../viewConfig";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand<
  Parameters<typeof createViewCliContainer>[0],
  ReturnType<typeof createViewCliContainer>,
  Parameters<typeof resolveViewContainerConfig>[0],
  ApplyViewOutput
>({
  description: "Apply view settings from YAML to kintone app",
  args: viewArgs,
  spinnerMessage: "Applying views...",
  spinnerStopMessage: "Views applied.",
  successMessage: "Views applied successfully.",
  createContainer: createViewCliContainer,
  applyFn: applyView,
  onResult: (result) => {
    if (result.skippedBuiltinViews.length > 0) {
      p.log.warn(
        `Skipped built-in views: ${result.skippedBuiltinViews.join(", ")}`,
      );
    }
  },
  diffPreview: {
    detectDiff: detectViewDiff,
    printResult: printViewDiffResult,
  },
  resolveContainerConfig: resolveViewContainerConfig,
  resolveAppContainerConfig: resolveViewAppContainerConfig,
});
