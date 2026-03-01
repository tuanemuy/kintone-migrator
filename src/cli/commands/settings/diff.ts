import { createGeneralSettingsCliContainer } from "@/core/application/container/generalSettingsCli";
import { detectGeneralSettingsDiff } from "@/core/application/generalSettings/detectGeneralSettingsDiff";
import { printGeneralSettingsDiffResult } from "../../output";
import {
  resolveSettingsAppContainerConfig,
  resolveSettingsContainerConfig,
  settingsArgs,
} from "../../settingsConfig";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description: "Compare local general settings config with remote kintone app",
  args: settingsArgs,
  spinnerMessage: "Comparing general settings...",
  multiAppSuccessMessage: "All general settings diffs completed successfully.",
  createContainer: createGeneralSettingsCliContainer,
  detectDiff: detectGeneralSettingsDiff,
  printResult: printGeneralSettingsDiffResult,
  resolveContainerConfig: resolveSettingsContainerConfig,
  resolveAppContainerConfig: resolveSettingsAppContainerConfig,
});
