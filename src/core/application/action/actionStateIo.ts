import type { ActionsConfig } from "@/core/domain/action/entity";
import { ActionStateSerializer } from "@/core/domain/action/services/actionStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { ActionDiffContainer } from "../container/action";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the actions snapshot (state file) and the app revision
 * (`state/<appName>/revision.yaml`) side by side. The two writes are kept
 * together so they always advance as a pair (snapshot → revision, ADR-188-009).
 */
export async function saveActionSnapshotAndRevision(
  container: ActionDiffContainer,
  config: ActionsConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.actionStateStorage,
    container.configCodec,
    ActionStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
