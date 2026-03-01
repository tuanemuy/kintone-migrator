import { CustomizationDiffDetector } from "@/core/domain/customization/services/diffDetector";
import type { CustomizationDiff } from "@/core/domain/customization/valueObject";
import type { CustomizationDiffServiceArgs } from "../container/customization";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseConfigText } from "./parseConfig";

export type { CustomizationDiffEntry } from "@/core/domain/customization/valueObject";

export async function detectCustomizationDiff({
  container,
}: CustomizationDiffServiceArgs): Promise<CustomizationDiff> {
  const [storageResult, remote] = await Promise.all([
    container.customizationStorage.get(),
    container.customizationConfigurator.getCustomization(),
  ]);
  if (!storageResult.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Customization config file not found",
    );
  }
  const localConfig = parseConfigText(storageResult.content);

  return CustomizationDiffDetector.detect(localConfig, remote);
}
