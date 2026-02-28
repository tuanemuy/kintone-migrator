import { CustomizationDiffDetector } from "@/core/domain/customization/services/diffDetector";
import type { CustomizationDiff } from "@/core/domain/customization/valueObject";
import type { CustomizationDiffServiceArgs } from "../container/customization";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseConfigText } from "./parseConfig";

export async function detectCustomizationDiff({
  container,
}: CustomizationDiffServiceArgs): Promise<CustomizationDiff> {
  const result = await container.customizationStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Customization config file not found",
    );
  }
  const localConfig = parseConfigText(result.content);

  const remote = await container.customizationConfigurator.getCustomization();

  return CustomizationDiffDetector.detect(localConfig, remote);
}
