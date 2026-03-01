import { GeneralSettingsDiffDetector } from "@/core/domain/generalSettings/services/diffDetector";
import type { GeneralSettingsDiff } from "@/core/domain/generalSettings/valueObject";
import type { GeneralSettingsDiffServiceArgs } from "../container/generalSettings";
import { detectDiffFromConfig } from "../detectDiffBase";
import { parseGeneralSettingsConfigText } from "./parseConfig";

export type { GeneralSettingsDiffEntry } from "@/core/domain/generalSettings/valueObject";

export async function detectGeneralSettingsDiff({
  container,
}: GeneralSettingsDiffServiceArgs): Promise<GeneralSettingsDiff> {
  return detectDiffFromConfig({
    getStorage: () => container.generalSettingsStorage.get(),
    fetchRemote: () =>
      container.generalSettingsConfigurator.getGeneralSettings(),
    parseConfig: parseGeneralSettingsConfigText,
    detect: (local, remote) =>
      GeneralSettingsDiffDetector.detect(local, remote.config),
    notFoundMessage: "General settings config file not found",
  });
}
