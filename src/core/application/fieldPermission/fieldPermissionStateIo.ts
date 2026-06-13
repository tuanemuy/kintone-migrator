import type { FieldPermissionConfig } from "@/core/domain/fieldPermission/entity";
import { FieldPermissionStateSerializer } from "@/core/domain/fieldPermission/services/fieldPermissionStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { FieldPermissionDiffContainer } from "../container/fieldPermission";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the field permission snapshot (state file) and the app
 * revision (`state/<appName>/revision.yaml`) side by side. The two writes are
 * kept together so they always advance as a pair (snapshot → revision).
 */
export async function saveFieldPermissionSnapshotAndRevision(
  container: FieldPermissionDiffContainer,
  config: FieldPermissionConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.fieldPermissionStateStorage,
    container.configCodec,
    FieldPermissionStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
