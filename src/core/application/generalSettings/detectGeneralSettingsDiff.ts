import { GeneralSettingsDiffDetector } from "@/core/domain/generalSettings/services/diffDetector";
import type { GeneralSettingsDiff } from "@/core/domain/generalSettings/valueObject";
import type { GeneralSettingsServiceArgs } from "../container/generalSettings";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseGeneralSettingsConfigText } from "./parseConfig";

export async function detectGeneralSettingsDiff({
  container,
}: GeneralSettingsServiceArgs): Promise<GeneralSettingsDiff> {
  const result = await container.generalSettingsStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "General settings config file not found",
    );
  }
  const localConfig = parseGeneralSettingsConfigText(result.content);

  const { config: remoteConfig } =
    await container.generalSettingsConfigurator.getGeneralSettings();

  return GeneralSettingsDiffDetector.detect(localConfig, remoteConfig);
}
