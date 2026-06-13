import type { RecordPermissionConfig } from "@/core/domain/recordPermission/entity";
import { RecordPermissionStateSerializer } from "@/core/domain/recordPermission/services/recordPermissionStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { RecordPermissionDiffContainer } from "../container/recordPermission";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the record permission snapshot (state file) and the
 * app revision (`state/<appName>/revision.yaml`) side by side. The two writes
 * are kept together so they always advance as a pair (snapshot → revision).
 */
export async function saveRecordPermissionSnapshotAndRevision(
  container: RecordPermissionDiffContainer,
  config: RecordPermissionConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.recordPermissionStateStorage,
    container.configCodec,
    RecordPermissionStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
