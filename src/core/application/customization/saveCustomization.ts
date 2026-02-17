import type { CustomizationServiceArgs } from "../container/customization";

export type SaveCustomizationInput = {
  readonly configText: string;
};

export async function saveCustomization({
  container,
  input,
}: CustomizationServiceArgs<SaveCustomizationInput>): Promise<void> {
  await container.customizationStorage.update(input.configText);
}
