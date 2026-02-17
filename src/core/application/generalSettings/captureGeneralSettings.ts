import { GeneralSettingsConfigSerializer } from "@/core/domain/generalSettings/services/configSerializer";
import type { GeneralSettingsServiceArgs } from "../container/generalSettings";

export type CaptureGeneralSettingsOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function captureGeneralSettings({
  container,
}: GeneralSettingsServiceArgs): Promise<CaptureGeneralSettingsOutput> {
  const { config } =
    await container.generalSettingsConfigurator.getGeneralSettings();

  const configText = GeneralSettingsConfigSerializer.serialize(config);
  const existing = await container.generalSettingsStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
