import type { NotificationConfig } from "@/core/domain/notification/entity";
import { NotificationStateSerializer } from "@/core/domain/notification/services/notificationStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { NotificationDiffContainer } from "../container/notification";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the notification snapshot (state file) and the app
 * revision (`state/<appName>/revision.yaml`) side by side. The two writes are
 * kept together so they always advance as a pair (snapshot → revision,
 * ADR-188-009).
 *
 * For push this is only ever called after all three `update*` calls succeed
 * (ADR-188-004): on a mid-sequence failure the base is left untouched so a
 * re-run absorbs the already-applied updates as no-op diffs.
 */
export async function saveNotificationSnapshotAndRevision(
  container: NotificationDiffContainer,
  config: NotificationConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.notificationStateStorage,
    container.configCodec,
    NotificationStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
