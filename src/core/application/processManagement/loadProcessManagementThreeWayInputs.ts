import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import { ProcessManagementStateParser } from "@/core/domain/processManagement/services/processManagementStateParser";
import type { ProcessManagementDiffContainer } from "../container/processManagement";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { parseProcessManagementConfigText } from "./parseConfig";

/** Remote process config carrying the revision it was observed at. */
export type ProcessManagementRemote = Readonly<{
  config: ProcessManagementConfig;
  revision: string;
}>;

export type ProcessManagementThreeWayInputs = ThreeWayInputs<
  ProcessManagementConfig,
  ProcessManagementRemote
>;

/**
 * Loads the four inputs of a 3-way process sync (base snapshot, base app
 * revision, local YAML, remote config + revision) via the generic
 * {@link loadThreeWayInputs}. Process is a single (whole-entity) config domain;
 * the remote is fetched with a single getter that carries its own revision.
 */
export async function loadProcessManagementThreeWayInputs(
  container: ProcessManagementDiffContainer,
): Promise<ProcessManagementThreeWayInputs> {
  return loadThreeWayInputs<ProcessManagementConfig, ProcessManagementRemote>({
    codec: container.configCodec,
    stateStorage: container.processManagementStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => ProcessManagementStateParser.parse(parsed).config,
    stateLabel: "Process management state",
    loadLocal: async () => {
      const result = await container.processManagementStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parseProcessManagementConfigText(
        container.configCodec,
        result.content,
      );
    },
    loadRemote: async () => {
      const { config, revision } =
        await container.processManagementConfigurator.getProcessManagement();
      return { config, revision };
    },
  });
}
