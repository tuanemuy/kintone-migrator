import { createCustomizationCliContainer } from "@/core/application/container/cli";
import { detectCustomizationDiff } from "@/core/application/customization/detectCustomizationDiff";
import {
  customizeArgs,
  resolveCustomizeAppConfig,
  resolveCustomizeConfig,
} from "../../customizeConfig";
import { printCustomizationDiffResult } from "../../output";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description: "Compare local customization config with remote kintone app",
  args: customizeArgs,
  spinnerMessage: "Comparing customization settings...",
  createContainer: createCustomizationCliContainer,
  detectDiff: detectCustomizationDiff,
  printResult: printCustomizationDiffResult,
  resolveContainerConfig: resolveCustomizeConfig,
  resolveAppContainerConfig: resolveCustomizeAppConfig,
});
