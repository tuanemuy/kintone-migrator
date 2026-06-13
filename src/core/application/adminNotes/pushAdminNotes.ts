import { computeAdminNotesThreeWayMerge } from "@/core/domain/adminNotes/services/adminNotesMerge";
import type { AdminNotesServiceArgs } from "../container/adminNotes";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { saveAdminNotesSnapshotAndRevision } from "./adminNotesStateIo";
import { loadAdminNotesThreeWayInputs } from "./loadAdminNotesThreeWayInputs";

export type PushAdminNotesInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

export type PushAdminNotesOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
};

/** Pull command name surfaced in the drift hint message. */
const ADMIN_NOTES_PULL_COMMAND = "admin-notes pull";

/**
 * Applies the local admin notes config to the remote with drift detection and
 * optimistic concurrency control (AC-10), as a whole-entity 3-way push
 * (ADR-188-014).
 */
export async function pushAdminNotes({
  container,
  input,
}: AdminNotesServiceArgs<PushAdminNotesInput>): Promise<PushAdminNotesOutput> {
  const { state, local, remote } =
    await loadAdminNotesThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Admin notes config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computeAdminNotesThreeWayMerge(state, local, remote.config);
    if (
      merge.change.kind === "remoteOnly" ||
      merge.change.kind === "conflict"
    ) {
      throw buildDriftConflict(ADMIN_NOTES_PULL_COMMAND);
    }
  }

  const expectedRevision =
    input.force || firstTime ? undefined : remote.revision;

  const { revision: newRevision } =
    await container.adminNotesConfigurator.updateAdminNotes({
      config: local,
      ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
    });

  await saveAdminNotesSnapshotAndRevision(container, local, newRevision);

  return {
    mode: firstTime ? "firstTime" : "push",
    revision: newRevision,
  };
}
