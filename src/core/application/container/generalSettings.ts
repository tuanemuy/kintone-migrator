import type { GeneralSettingsConfigurator } from "@/core/domain/generalSettings/ports/generalSettingsConfigurator";
import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type GeneralSettingsContainer = {
  generalSettingsConfigurator: GeneralSettingsConfigurator;
  generalSettingsStorage: GeneralSettingsStorage;
  appDeployer: AppDeployer;
};

export type GeneralSettingsServiceArgs<T = undefined> = ServiceArgs<
  GeneralSettingsContainer,
  T
>;
