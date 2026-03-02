import type { CustomizationCaptureServiceArgs } from "../container/customization";

export type SaveCustomizationInput = {
  readonly configText: string;
};

export async function saveCustomization({
  container,
  input,
}: CustomizationCaptureServiceArgs<SaveCustomizationInput>): Promise<void> {
  await container.customizationStorage.update(input.configText);
}
