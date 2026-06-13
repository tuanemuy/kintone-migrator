import { computeRecordPermissionThreeWayMerge } from "@/core/domain/recordPermission/services/recordPermissionMerge";
import type { RecordPermissionServiceArgs } from "../container/recordPermission";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { loadRecordPermissionThreeWayInputs } from "./loadRecordPermissionThreeWayInputs";
import { saveRecordPermissionSnapshotAndRevision } from "./recordPermissionStateIo";

export type PushRecordPermissionInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

export type PushRecordPermissionOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
};

/** Pull command name surfaced in the drift hint message. */
const RECORD_ACL_PULL_COMMAND = "record-acl pull";

/**
 * Applies the local record permission config to the remote with drift detection
 * and optimistic concurrency control.
 *
 * - Loads base/local/remote (the remote carries its own revision).
 * - drift (remoteOnly or conflict entries) && !force → {@link buildDriftConflict}
 *   tagged with `ConfigDrift`, distinguished from API optimistic-lock conflicts
 *   by error code.
 * - otherwise replaces the rights, sending the observed remote revision as the
 *   expected revision (TOCTOU guard). `--force` / first run send
 *   no revision (kintone skips the revision check).
 */
export async function pushRecordPermission({
  container,
  input,
}: RecordPermissionServiceArgs<PushRecordPermissionInput>): Promise<PushRecordPermissionOutput> {
  const { state, local, remote } =
    await loadRecordPermissionThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Record permission config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computeRecordPermissionThreeWayMerge(
      state,
      local,
      remote.config,
    );
    const hasDrift = merge.entries.some(
      (e) => e.change.kind === "remoteOnly" || e.change.kind === "conflict",
    );
    if (hasDrift) {
      throw buildDriftConflict(RECORD_ACL_PULL_COMMAND);
    }
  }

  const expectedRevision =
    input.force || firstTime ? undefined : remote.revision;

  const { revision: newRevision } =
    await container.recordPermissionConfigurator.updateRecordPermissions({
      rights: local.rights,
      ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
    });

  await saveRecordPermissionSnapshotAndRevision(container, local, newRevision);

  return {
    mode: firstTime ? "firstTime" : "push",
    revision: newRevision,
  };
}
