import { CustomizationDiffDetector } from "@/core/domain/customization/services/diffDetector";
import type { CustomizationDiff } from "@/core/domain/customization/valueObject";
import type { CustomizationDiffServiceArgs } from "../container/customization";
import { detectDiffFromConfig } from "../detectDiffBase";
import { parseConfigText } from "./parseConfig";

export type { CustomizationDiffEntry } from "@/core/domain/customization/valueObject";

export async function detectCustomizationDiff({
  container,
}: CustomizationDiffServiceArgs): Promise<CustomizationDiff> {
  return detectDiffFromConfig({
    getStorage: () => container.customizationStorage.get(),
    fetchRemote: () => container.customizationConfigurator.getCustomization(),
    parseConfig: (content) => parseConfigText(content),
    detect: (local, remote) => CustomizationDiffDetector.detect(local, remote),
    notFoundMessage: "Customization config file not found",
  });
}
