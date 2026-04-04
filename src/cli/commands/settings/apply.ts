import { createGeneralSettingsCliContainer } from "@/core/application/container/generalSettingsCli";
import { applyGeneralSettings } from "@/core/application/generalSettings/applyGeneralSettings";
import { detectGeneralSettingsDiff } from "@/core/application/generalSettings/detectGeneralSettingsDiff";
import { printGeneralSettingsDiffResult } from "../../output";
import {
  resolveSettingsAppContainerConfig,
  resolveSettingsContainerConfig,
  settingsArgs,
} from "../../settingsConfig";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply general settings from YAML to kintone app",
  args: settingsArgs,
  spinnerMessage: "Applying general settings...",
  spinnerStopMessage: "General settings applied.",
  successMessage: "General settings applied successfully.",
  createContainer: createGeneralSettingsCliContainer,
  applyFn: applyGeneralSettings,
  diffPreview: {
    detectDiff: detectGeneralSettingsDiff,
    printResult: printGeneralSettingsDiffResult,
  },
  resolveContainerConfig: resolveSettingsContainerConfig,
  resolveAppContainerConfig: resolveSettingsAppContainerConfig,
});
