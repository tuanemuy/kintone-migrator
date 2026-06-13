import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { GeneralSettingsConfigurator } from "@/core/domain/generalSettings/ports/generalSettingsConfigurator";
import type { GeneralSettingsStateStorage } from "@/core/domain/generalSettings/ports/generalSettingsStateStorage";
import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

export type GeneralSettingsDiffContainer = {
  configCodec: ConfigCodec;
  generalSettingsConfigurator: GeneralSettingsConfigurator;
  generalSettingsStorage: GeneralSettingsStorage;
  // Base snapshot storage for 3-way diff/pull/push.
  generalSettingsStateStorage: GeneralSettingsStateStorage;
  // App-scoped base revision storage (shared across domains).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place.
  appRevisionReader: AppRevisionReader;
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
