import type { FieldPermissionConfig } from "@/core/domain/fieldPermission/entity";
import { FieldPermissionStateParser } from "@/core/domain/fieldPermission/services/fieldPermissionStateParser";
import type { FieldPermissionDiffContainer } from "../container/fieldPermission";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { parseFieldPermissionConfigText } from "./parseConfig";

/** Remote field permission config carrying the revision it was observed at. */
export type FieldPermissionRemote = Readonly<{
  config: FieldPermissionConfig;
  revision: string;
}>;

export type FieldPermissionThreeWayInputs = ThreeWayInputs<
  FieldPermissionConfig,
  FieldPermissionRemote
>;

/**
 * Loads the four inputs of a 3-way field permission sync (base snapshot, base
 * app revision, local YAML, remote config + revision) via the generic
 * {@link loadThreeWayInputs}. The rights list is keyed by field `code`
 * (record-keyed), so it loads thinly on top of the generic helper (ADR-188-016).
 */
export async function loadFieldPermissionThreeWayInputs(
  container: FieldPermissionDiffContainer,
): Promise<FieldPermissionThreeWayInputs> {
  return loadThreeWayInputs<FieldPermissionConfig, FieldPermissionRemote>({
    codec: container.configCodec,
    stateStorage: container.fieldPermissionStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => FieldPermissionStateParser.parse(parsed).config,
    stateLabel: "Field permission state",
    loadLocal: async () => {
      const result = await container.fieldPermissionStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parseFieldPermissionConfigText(
        container.configCodec,
        result.content,
      );
    },
    loadRemote: async () => {
      const { rights, revision } =
        await container.fieldPermissionConfigurator.getFieldPermissions();
      return { config: { rights }, revision };
    },
  });
}
