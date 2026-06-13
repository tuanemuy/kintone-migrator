import type { AppPermissionConfig } from "@/core/domain/appPermission/entity";
import { AppPermissionStateParser } from "@/core/domain/appPermission/services/appPermissionStateParser";
import type { AppPermissionDiffContainer } from "../container/appPermission";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { parseAppPermissionConfigText } from "./parseConfig";

/** Remote app permission config carrying the revision it was observed at. */
export type AppPermissionRemote = Readonly<{
  config: AppPermissionConfig;
  revision: string;
}>;

export type AppPermissionThreeWayInputs = ThreeWayInputs<
  AppPermissionConfig,
  AppPermissionRemote
>;

/**
 * Loads the four inputs of a 3-way app permission sync (base snapshot, base app
 * revision, local YAML, remote config + revision) via the generic
 * {@link loadThreeWayInputs}. The rights list is entity-keyed (record-keyed),
 * so it loads thinly on top of the generic helper.
 */
export async function loadAppPermissionThreeWayInputs(
  container: AppPermissionDiffContainer,
): Promise<AppPermissionThreeWayInputs> {
  return loadThreeWayInputs<AppPermissionConfig, AppPermissionRemote>({
    codec: container.configCodec,
    stateStorage: container.appPermissionStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => AppPermissionStateParser.parse(parsed).config,
    stateLabel: "App permission state",
    loadLocal: async () => {
      const result = await container.appPermissionStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parseAppPermissionConfigText(
        container.configCodec,
        result.content,
      );
    },
    loadRemote: async () => {
      const { rights, revision } =
        await container.appPermissionConfigurator.getAppPermissions();
      return { config: { rights }, revision };
    },
  });
}
