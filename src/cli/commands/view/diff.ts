import { createViewCliContainer } from "@/core/application/container/viewCli";
import { detectViewDiff } from "@/core/application/view/detectViewDiff";
import { printViewDiffResult } from "../../output";
import {
  resolveViewAppContainerConfig,
  resolveViewContainerConfig,
  viewArgs,
} from "../../viewConfig";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description: "Compare local view config with remote kintone app",
  args: viewArgs,
  spinnerMessage: "Comparing view settings...",
  multiAppSuccessMessage: "All view diffs completed successfully.",
  createContainer: createViewCliContainer,
  detectDiff: detectViewDiff,
  printResult: printViewDiffResult,
  resolveContainerConfig: resolveViewContainerConfig,
  resolveAppContainerConfig: resolveViewAppContainerConfig,
});
