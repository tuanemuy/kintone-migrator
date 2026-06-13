import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import { GeneralSettingsStateParser } from "@/core/domain/generalSettings/services/generalSettingsStateParser";
import type { GeneralSettingsDiffContainer } from "../container/generalSettings";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { parseGeneralSettingsConfigText } from "./parseConfig";

/** Remote settings config carrying the revision it was observed at. */
export type GeneralSettingsRemote = Readonly<{
  config: GeneralSettingsConfig;
  revision: string;
}>;

export type GeneralSettingsThreeWayInputs = ThreeWayInputs<
  GeneralSettingsConfig,
  GeneralSettingsRemote
>;

/**
 * Loads the four inputs of a 3-way settings sync (base snapshot, base app
 * revision, local YAML, remote config + revision) via the generic
 * {@link loadThreeWayInputs}. Settings is a single (whole-entity) config domain;
 * the remote is fetched with a single getter that carries its own revision.
 */
export async function loadGeneralSettingsThreeWayInputs(
  container: GeneralSettingsDiffContainer,
): Promise<GeneralSettingsThreeWayInputs> {
  return loadThreeWayInputs<GeneralSettingsConfig, GeneralSettingsRemote>({
    codec: container.configCodec,
    stateStorage: container.generalSettingsStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => GeneralSettingsStateParser.parse(parsed).config,
    stateLabel: "General settings state",
    loadLocal: async () => {
      const result = await container.generalSettingsStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parseGeneralSettingsConfigText(
        container.configCodec,
        result.content,
      );
    },
    loadRemote: async () => {
      const { config, revision } =
        await container.generalSettingsConfigurator.getGeneralSettings();
      return { config, revision };
    },
  });
}
