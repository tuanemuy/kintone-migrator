import { createGeneralSettingsCliContainer } from "@/core/application/container/generalSettingsCli";
import { captureGeneralSettings } from "@/core/application/generalSettings/captureGeneralSettings";
import { saveGeneralSettings } from "@/core/application/generalSettings/saveGeneralSettings";
import {
  resolveSettingsAppContainerConfig,
  resolveSettingsContainerConfig,
  settingsArgs,
} from "../../settingsConfig";
import { createCaptureCommand } from "../captureCommandFactory";

export default createCaptureCommand({
  description: "Capture current general settings from kintone app to file",
  args: settingsArgs,
  spinnerMessage: "Capturing general settings...",
  spinnerStopMessage: "General settings captured.",
  domainLabel: "General settings",
  multiAppSuccessMessage:
    "All general settings captures completed successfully.",
  createContainer: createGeneralSettingsCliContainer,
  captureFn: captureGeneralSettings,
  saveFn: saveGeneralSettings,
  getConfigFilePath: (config) => config.settingsFilePath,
  resolveContainerConfig: resolveSettingsContainerConfig,
  resolveAppContainerConfig: resolveSettingsAppContainerConfig,
});
