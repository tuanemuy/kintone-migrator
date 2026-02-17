import type { CustomizationCaptureContainer } from "../container/customization";

export type SaveCustomizationInput = {
  readonly configText: string;
};

export async function saveCustomization({
  container,
  input,
}: {
  container: Pick<CustomizationCaptureContainer, "customizationStorage">;
  input: SaveCustomizationInput;
}): Promise<void> {
  await container.customizationStorage.update(input.configText);
}
