import type { GeneralSettingsServiceArgs } from "../container/generalSettings";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseGeneralSettingsConfigText } from "./parseConfig";

export async function applyGeneralSettings({
  container,
}: GeneralSettingsServiceArgs): Promise<void> {
  const result = await container.generalSettingsStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "General settings config file not found",
    );
  }
  const config = parseGeneralSettingsConfigText(result.content);

  const current =
    await container.generalSettingsConfigurator.getGeneralSettings();

  await container.generalSettingsConfigurator.updateGeneralSettings({
    config,
    revision: current.revision,
  });
}
