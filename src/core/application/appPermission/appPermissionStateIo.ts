import type { AppPermissionConfig } from "@/core/domain/appPermission/entity";
import { AppPermissionStateSerializer } from "@/core/domain/appPermission/services/appPermissionStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { AppPermissionDiffContainer } from "../container/appPermission";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the app permission snapshot (state file) and the app
 * revision (`state/<appName>/revision.yaml`) side by side. The two writes are
 * kept together so they always advance as a pair (snapshot → revision).
 */
export async function saveAppPermissionSnapshotAndRevision(
  container: AppPermissionDiffContainer,
  config: AppPermissionConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.appPermissionStateStorage,
    container.configCodec,
    AppPermissionStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
