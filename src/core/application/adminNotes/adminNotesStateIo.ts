import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import { AdminNotesStateSerializer } from "@/core/domain/adminNotes/services/adminNotesStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { AdminNotesDiffContainer } from "../container/adminNotes";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the admin notes snapshot (state file) and the app
 * revision (`state/<appName>/revision.yaml`) side by side. The two writes are
 * kept together so they always advance as a pair (snapshot → revision).
 */
export async function saveAdminNotesSnapshotAndRevision(
  container: AdminNotesDiffContainer,
  config: AdminNotesConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.adminNotesStateStorage,
    container.configCodec,
    AdminNotesStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
