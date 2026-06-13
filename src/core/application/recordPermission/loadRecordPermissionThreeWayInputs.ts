import type { RecordPermissionConfig } from "@/core/domain/recordPermission/entity";
import { RecordPermissionStateParser } from "@/core/domain/recordPermission/services/recordPermissionStateParser";
import type { RecordPermissionDiffContainer } from "../container/recordPermission";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { parseRecordPermissionConfigText } from "./parseConfig";

/** Remote record permission config carrying the revision it was observed at. */
export type RecordPermissionRemote = Readonly<{
  config: RecordPermissionConfig;
  revision: string;
}>;

export type RecordPermissionThreeWayInputs = ThreeWayInputs<
  RecordPermissionConfig,
  RecordPermissionRemote
>;

/**
 * Loads the four inputs of a 3-way record permission sync (base snapshot, base
 * app revision, local YAML, remote config + revision) via the generic
 * {@link loadThreeWayInputs}. The rights list is keyed by `filterCond#i`
 * (record-keyed), so it loads thinly on top of the generic helper (ADR-188-016).
 */
export async function loadRecordPermissionThreeWayInputs(
  container: RecordPermissionDiffContainer,
): Promise<RecordPermissionThreeWayInputs> {
  return loadThreeWayInputs<RecordPermissionConfig, RecordPermissionRemote>({
    codec: container.configCodec,
    stateStorage: container.recordPermissionStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => RecordPermissionStateParser.parse(parsed).config,
    stateLabel: "Record permission state",
    loadLocal: async () => {
      const result = await container.recordPermissionStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parseRecordPermissionConfigText(
        container.configCodec,
        result.content,
      );
    },
    loadRemote: async () => {
      const { rights, revision } =
        await container.recordPermissionConfigurator.getRecordPermissions();
      return { config: { rights }, revision };
    },
  });
}
