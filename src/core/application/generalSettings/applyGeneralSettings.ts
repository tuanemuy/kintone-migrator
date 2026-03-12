import { applyFromConfig } from "../applyFromConfigBase";
import type { GeneralSettingsServiceArgs } from "../container/generalSettings";
import { parseGeneralSettingsConfigText } from "./parseConfig";

export async function applyGeneralSettings({
  container,
}: GeneralSettingsServiceArgs): Promise<void> {
  await applyFromConfig({
    getStorage: () => container.generalSettingsStorage.get(),
    parseConfig: (content) =>
      parseGeneralSettingsConfigText(container.configCodec, content),
    fetchRemote: () =>
      container.generalSettingsConfigurator.getGeneralSettings(),
    update: async (config, current) => {
      await container.generalSettingsConfigurator.updateGeneralSettings({
        config,
        revision: current.revision,
      });
    },
    notFoundMessage: "General settings config file not found",
  });
}
