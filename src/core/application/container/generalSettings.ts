import type { GeneralSettingsConfigurator } from "@/core/domain/generalSettings/ports/generalSettingsConfigurator";
import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";

export type GeneralSettingsContainer = {
  generalSettingsConfigurator: GeneralSettingsConfigurator;
  generalSettingsStorage: GeneralSettingsStorage;
  appDeployer: AppDeployer;
};

export type GeneralSettingsServiceArgs<T = undefined> = T extends undefined
  ? { container: GeneralSettingsContainer }
  : { container: GeneralSettingsContainer; input: T };
