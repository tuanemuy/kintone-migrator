import type { GeneralSettingsServiceArgs } from "../container/generalSettings";

export type SaveGeneralSettingsInput = {
  readonly configText: string;
};

export async function saveGeneralSettings({
  container,
  input,
}: GeneralSettingsServiceArgs<SaveGeneralSettingsInput>): Promise<void> {
  await container.generalSettingsStorage.update(input.configText);
}
