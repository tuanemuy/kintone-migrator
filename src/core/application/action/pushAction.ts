import { computeActionThreeWayMerge } from "@/core/domain/action/services/actionMerge";
import type { ActionServiceArgs } from "../container/action";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { saveActionSnapshotAndRevision } from "./actionStateIo";
import { loadActionThreeWayInputs } from "./loadActionThreeWayInputs";

export type PushActionInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

export type PushActionOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
};

/** Pull command name surfaced in the drift hint message. */
const ACTION_PULL_COMMAND = "action pull";

/**
 * Applies the local action config to the remote with drift detection and
 * optimistic concurrency control (AC-10).
 *
 * - Loads base/local/remote (the remote carries its own revision).
 * - drift (remoteOnly or conflict entries) && !force → {@link buildDriftConflict}
 *   tagged with `ConfigDrift`, distinguished from API optimistic-lock conflicts
 *   by error code (ADR-188-006).
 * - otherwise replaces the actions, sending the observed remote revision as the
 *   expected revision (TOCTOU guard, ADR-188-004). `--force` / first run send
 *   no revision (kintone skips the revision check).
 *
 * Deploy is performed by the CLI (`confirmAndDeploy`). State records the local
 * config and the post-apply revision as the new base (snapshot → revision).
 */
export async function pushAction({
  container,
  input,
}: ActionServiceArgs<PushActionInput>): Promise<PushActionOutput> {
  const { state, local, remote } = await loadActionThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Action config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computeActionThreeWayMerge(state, local, remote.config);
    const hasDrift = merge.entries.some(
      (e) => e.change.kind === "remoteOnly" || e.change.kind === "conflict",
    );
    if (hasDrift) {
      throw buildDriftConflict(ACTION_PULL_COMMAND);
    }
  }

  // Expected revision (ADR-188-004): the observed remote revision guards against
  // TOCTOU on a normal push. `--force` / first run omit it so the apply does not
  // fail on an unrelated concurrent change (kintone skips the revision check
  // when revision is undefined).
  const expectedRevision =
    input.force || firstTime ? undefined : remote.revision;

  const { revision: newRevision } =
    await container.actionConfigurator.updateActions({
      actions: local.actions,
      ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
    });

  await saveActionSnapshotAndRevision(container, local, newRevision);

  return {
    mode: firstTime ? "firstTime" : "push",
    revision: newRevision,
  };
}
