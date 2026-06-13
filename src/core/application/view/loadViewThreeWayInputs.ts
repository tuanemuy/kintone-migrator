import type { ViewsConfig } from "@/core/domain/view/entity";
import { ViewStateParser } from "@/core/domain/view/services/viewStateParser";
import type { ViewDiffContainer } from "../container/view";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { parseViewConfigText } from "./parseConfig";

/** Remote view config carrying the revision it was observed at. */
export type ViewRemote = Readonly<{
  config: ViewsConfig;
  revision: string;
}>;

export type ViewThreeWayInputs = ThreeWayInputs<ViewsConfig, ViewRemote>;

/**
 * Loads the four inputs of a 3-way view sync (base snapshot, base app revision,
 * local YAML, remote config + revision) via the generic
 * {@link loadThreeWayInputs}. View is the record-keyed reference domain: the
 * remote is fetched with a single getter that carries its own revision, so it
 * loads thinly on top of the generic helper (ADR-188-008).
 */
export async function loadViewThreeWayInputs(
  container: ViewDiffContainer,
): Promise<ViewThreeWayInputs> {
  return loadThreeWayInputs<ViewsConfig, ViewRemote>({
    codec: container.configCodec,
    stateStorage: container.viewStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => ViewStateParser.parse(parsed).config,
    stateLabel: "View state",
    loadLocal: async () => {
      const result = await container.viewStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parseViewConfigText(container.configCodec, result.content);
    },
    loadRemote: async () => {
      const { views, revision } = await container.viewConfigurator.getViews();
      return { config: { views }, revision };
    },
  });
}
