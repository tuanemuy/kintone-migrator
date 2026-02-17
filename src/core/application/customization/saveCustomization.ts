import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";

export type SaveCustomizationInput = {
  readonly configText: string;
};

export async function saveCustomization({
  container,
  input,
}: {
  container: { customizationStorage: CustomizationStorage };
  input: SaveCustomizationInput;
}): Promise<void> {
  await container.customizationStorage.update(input.configText);
}
