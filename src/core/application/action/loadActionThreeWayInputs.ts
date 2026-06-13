import type { ActionsConfig } from "@/core/domain/action/entity";
import { ActionStateParser } from "@/core/domain/action/services/actionStateParser";
import type { ActionDiffContainer } from "../container/action";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { parseActionConfigText } from "./parseConfig";

/** Remote actions config carrying the revision it was observed at. */
export type ActionRemote = Readonly<{
  config: ActionsConfig;
  revision: string;
}>;

export type ActionThreeWayInputs = ThreeWayInputs<ActionsConfig, ActionRemote>;

/**
 * Loads the four inputs of a 3-way action sync (base snapshot, base app
 * revision, local YAML, remote config + revision) via the generic
 * {@link loadThreeWayInputs}. Action is a record-keyed domain like view: the
 * remote is fetched with a single getter that carries its own revision, so it
 * loads thinly on top of the generic helper.
 */
export async function loadActionThreeWayInputs(
  container: ActionDiffContainer,
): Promise<ActionThreeWayInputs> {
  return loadThreeWayInputs<ActionsConfig, ActionRemote>({
    codec: container.configCodec,
    stateStorage: container.actionStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => ActionStateParser.parse(parsed).config,
    stateLabel: "Action state",
    loadLocal: async () => {
      const result = await container.actionStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parseActionConfigText(container.configCodec, result.content);
    },
    loadRemote: async () => {
      const { actions, revision } =
        await container.actionConfigurator.getActions();
      return { config: { actions }, revision };
    },
  });
}
