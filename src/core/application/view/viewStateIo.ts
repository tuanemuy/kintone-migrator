import type { ViewsConfig } from "@/core/domain/view/entity";
import { ViewStateSerializer } from "@/core/domain/view/services/viewStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { ViewDiffContainer } from "../container/view";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the views snapshot (state file) and the app revision
 * (`state/<appName>/revision.yaml`) side by side. The two writes are kept
 * together so they always advance as a pair (snapshot → revision).
 */
export async function saveViewSnapshotAndRevision(
  container: ViewDiffContainer,
  config: ViewsConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.viewStateStorage,
    container.configCodec,
    ViewStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
