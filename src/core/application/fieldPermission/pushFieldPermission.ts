import { computeFieldPermissionThreeWayMerge } from "@/core/domain/fieldPermission/services/fieldPermissionMerge";
import type { FieldPermissionServiceArgs } from "../container/fieldPermission";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { saveFieldPermissionSnapshotAndRevision } from "./fieldPermissionStateIo";
import { loadFieldPermissionThreeWayInputs } from "./loadFieldPermissionThreeWayInputs";

export type PushFieldPermissionInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

export type PushFieldPermissionOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
};

/** Pull command name surfaced in the drift hint message. */
const FIELD_ACL_PULL_COMMAND = "field-acl pull";

/**
 * Applies the local field permission config to the remote with drift detection
 * and optimistic concurrency control (AC-10).
 *
 * - Loads base/local/remote (the remote carries its own revision).
 * - drift (remoteOnly or conflict entries) && !force → {@link buildDriftConflict}
 *   tagged with `ConfigDrift`, distinguished from API optimistic-lock conflicts
 *   by error code (ADR-188-006).
 * - otherwise replaces the rights, sending the observed remote revision as the
 *   expected revision (TOCTOU guard, ADR-188-004). `--force` / first run send
 *   no revision (kintone skips the revision check).
 */
export async function pushFieldPermission({
  container,
  input,
}: FieldPermissionServiceArgs<PushFieldPermissionInput>): Promise<PushFieldPermissionOutput> {
  const { state, local, remote } =
    await loadFieldPermissionThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Field permission config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computeFieldPermissionThreeWayMerge(
      state,
      local,
      remote.config,
    );
    const hasDrift = merge.entries.some(
      (e) => e.change.kind === "remoteOnly" || e.change.kind === "conflict",
    );
    if (hasDrift) {
      throw buildDriftConflict(FIELD_ACL_PULL_COMMAND);
    }
  }

  const expectedRevision =
    input.force || firstTime ? undefined : remote.revision;

  const { revision: newRevision } =
    await container.fieldPermissionConfigurator.updateFieldPermissions({
      rights: local.rights,
      ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
    });

  await saveFieldPermissionSnapshotAndRevision(container, local, newRevision);

  return {
    mode: firstTime ? "firstTime" : "push",
    revision: newRevision,
  };
}
