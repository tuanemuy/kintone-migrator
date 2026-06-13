import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationStateParser } from "@/core/domain/customization/services/customizationStateParser";
import type { RemoteCustomization } from "@/core/domain/customization/valueObject";
import type { CustomizationThreeWayContainer } from "../container/customization";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { remoteToConfig } from "./customizationRemote";
import { parseCustomizationConfigText } from "./parseConfig";

/**
 * Remote customization carrying the revision it was observed at, both the raw
 * API shape (file metadata, needed to download contents for conflict detection
 * and pull) and the {@link CustomizationConfig} view used for the file-name
 * merge.
 */
export type CustomizationRemote = Readonly<{
  raw: RemoteCustomization;
  config: CustomizationConfig;
  revision: string;
}>;

export type CustomizationThreeWayInputs = ThreeWayInputs<
  CustomizationConfig,
  CustomizationRemote
>;

/**
 * Loads the four inputs of a 3-way customization sync (base snapshot, base app
 * revision, local YAML, remote customization + revision) via the generic
 * {@link loadThreeWayInputs}. The remote is fetched once with its revision; the
 * raw form is kept for file-content download (AC-9).
 */
export async function loadCustomizationThreeWayInputs(
  container: CustomizationThreeWayContainer,
): Promise<CustomizationThreeWayInputs> {
  return loadThreeWayInputs<CustomizationConfig, CustomizationRemote>({
    codec: container.configCodec,
    stateStorage: container.customizationStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => CustomizationStateParser.parse(parsed).config,
    stateLabel: "Customization state",
    loadLocal: async () => {
      const result = await container.customizationStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parseCustomizationConfigText(
        container.configCodec,
        result.content,
      );
    },
    loadRemote: async () => {
      const { scope, desktop, mobile, revision } =
        await container.customizationConfigurator.getCustomization();
      const raw: RemoteCustomization = { scope, desktop, mobile };
      return { raw, config: remoteToConfig(raw), revision };
    },
  });
}
