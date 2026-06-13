import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import { ProcessManagementStateSerializer } from "@/core/domain/processManagement/services/processManagementStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { ProcessManagementDiffContainer } from "../container/processManagement";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the process snapshot (state file) and the app revision
 * (`state/<appName>/revision.yaml`) side by side. The two writes are kept
 * together so they always advance as a pair (snapshot → revision).
 */
export async function saveProcessManagementSnapshotAndRevision(
  container: ProcessManagementDiffContainer,
  config: ProcessManagementConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.processManagementStateStorage,
    container.configCodec,
    ProcessManagementStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
