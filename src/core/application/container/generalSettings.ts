import type { GeneralSettingsConfigurator } from "@/core/domain/generalSettings/ports/generalSettingsConfigurator";
import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type GeneralSettingsDiffContainer = {
  generalSettingsConfigurator: GeneralSettingsConfigurator;
  generalSettingsStorage: GeneralSettingsStorage;
};

export type GeneralSettingsContainer = GeneralSettingsDiffContainer & {
  appDeployer: AppDeployer;
};

export type GeneralSettingsDiffServiceArgs<T = undefined> = ServiceArgs<
  GeneralSettingsDiffContainer,
  T
>;

export type GeneralSettingsServiceArgs<T = undefined> = ServiceArgs<
  GeneralSettingsContainer,
  T
>;
