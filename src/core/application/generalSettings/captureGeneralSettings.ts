import { GeneralSettingsConfigSerializer } from "@/core/domain/generalSettings/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { GeneralSettingsServiceArgs } from "../container/generalSettings";

export type CaptureGeneralSettingsOutput = CaptureOutput;

export async function captureGeneralSettings({
  container,
}: GeneralSettingsServiceArgs): Promise<CaptureGeneralSettingsOutput> {
  return captureFromConfig({
    fetchRemote: () =>
      container.generalSettingsConfigurator.getGeneralSettings(),
    serialize: ({ config }) =>
      GeneralSettingsConfigSerializer.serialize(config),
    getStorage: () => container.generalSettingsStorage.get(),
  });
}
