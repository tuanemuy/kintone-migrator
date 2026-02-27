import { CustomizationDiffDetector } from "@/core/domain/customization/services/diffDetector";
import type { CustomizationDiff } from "@/core/domain/customization/valueObject";
import type { CustomizationApplyServiceArgs } from "../container/customization";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseConfigText } from "./parseConfig";

export async function detectCustomizationDiff({
  container,
}: CustomizationApplyServiceArgs): Promise<CustomizationDiff> {
  const result = await container.customizationStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Customization config file not found",
    );
  }
  const localConfig = parseConfigText(result.content);

  const {
    scope: remoteScope,
    desktop: remoteDesktop,
    mobile: remoteMobile,
  } = await container.customizationConfigurator.getCustomization();

  return CustomizationDiffDetector.detect(
    localConfig,
    remoteScope,
    remoteDesktop,
    remoteMobile,
  );
}
