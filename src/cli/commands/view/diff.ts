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
  description:
    "Detect differences between view config file and current kintone views",
  args: viewArgs,
  spinnerMessage: "Fetching views...",
  createContainer: createViewCliContainer,
  detectDiff: detectViewDiff,
  printResult: printViewDiffResult,
  resolveContainerConfig: resolveViewContainerConfig,
  resolveAppContainerConfig: resolveViewAppContainerConfig,
});
