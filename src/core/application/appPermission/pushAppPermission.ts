import { computeAppPermissionThreeWayMerge } from "@/core/domain/appPermission/services/appPermissionMerge";
import type { AppPermissionServiceArgs } from "../container/appPermission";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { saveAppPermissionSnapshotAndRevision } from "./appPermissionStateIo";
import { loadAppPermissionThreeWayInputs } from "./loadAppPermissionThreeWayInputs";

export type PushAppPermissionInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

export type PushAppPermissionOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
};

/** Pull command name surfaced in the drift hint message. */
const APP_ACL_PULL_COMMAND = "app-acl pull";

/**
 * Applies the local app permission config to the remote with drift detection
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
export async function pushAppPermission({
  container,
  input,
}: AppPermissionServiceArgs<PushAppPermissionInput>): Promise<PushAppPermissionOutput> {
  const { state, local, remote } =
    await loadAppPermissionThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "App permission config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computeAppPermissionThreeWayMerge(
      state,
      local,
      remote.config,
    );
    const hasDrift = merge.entries.some(
      (e) => e.change.kind === "remoteOnly" || e.change.kind === "conflict",
    );
    if (hasDrift) {
      throw buildDriftConflict(APP_ACL_PULL_COMMAND);
    }
  }

  const expectedRevision =
    input.force || firstTime ? undefined : remote.revision;

  const { revision: newRevision } =
    await container.appPermissionConfigurator.updateAppPermissions({
      rights: local.rights,
      ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
    });

  await saveAppPermissionSnapshotAndRevision(container, local, newRevision);

  return {
    mode: firstTime ? "firstTime" : "push",
    revision: newRevision,
  };
}
