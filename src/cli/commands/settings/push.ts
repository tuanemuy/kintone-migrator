import * as p from "@clack/prompts";
import { createGeneralSettingsCliContainer } from "@/core/application/container/generalSettingsCli";
import { pushGeneralSettings } from "@/core/application/generalSettings/pushGeneralSettings";
import {
  resolveSettingsAppContainerConfig,
  resolveSettingsContainerConfig,
  settingsArgs,
} from "../../settingsConfig";
import { createPushCommand } from "../pushCommandFactory";

export default createPushCommand({
  description:
    "Push the local general settings config to kintone (with drift detection)",
  args: settingsArgs,
  subject: "general settings config",
  spinnerStopMessage: "General settings pushed to preview.",
  createContainer: createGeneralSettingsCliContainer,
  pushFn: pushGeneralSettings,
  toctouMessage:
    "The remote changed while applying. Run `settings pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
  },
  resolveContainerConfig: resolveSettingsContainerConfig,
  resolveAppContainerConfig: resolveSettingsAppContainerConfig,
});
