import { computeProcessManagementThreeWayMerge } from "@/core/domain/processManagement/services/processManagementMerge";
import type { ProcessManagementServiceArgs } from "../container/processManagement";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { loadProcessManagementThreeWayInputs } from "./loadProcessManagementThreeWayInputs";
import { saveProcessManagementSnapshotAndRevision } from "./processManagementStateIo";

export type PushProcessManagementInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

export type PushProcessManagementOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
};

/** Pull command name surfaced in the drift hint message. */
const PROCESS_PULL_COMMAND = "process pull";

/**
 * Applies the local process management config to the remote with drift detection
 * and optimistic concurrency control, as a whole-entity 3-way push. The whole config (including `enable` and all states/actions) is
 * sent in one `updateProcessManagement` call, matching `process apply`.
 */
export async function pushProcessManagement({
  container,
  input,
}: ProcessManagementServiceArgs<PushProcessManagementInput>): Promise<PushProcessManagementOutput> {
  const { state, local, remote } =
    await loadProcessManagementThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Process management config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computeProcessManagementThreeWayMerge(
      state,
      local,
      remote.config,
    );
    if (
      merge.change.kind === "remoteOnly" ||
      merge.change.kind === "conflict"
    ) {
      throw buildDriftConflict(PROCESS_PULL_COMMAND);
    }
  }

  const expectedRevision =
    input.force || firstTime ? undefined : remote.revision;

  const { revision: newRevision } =
    await container.processManagementConfigurator.updateProcessManagement({
      config: local,
      ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
    });

  await saveProcessManagementSnapshotAndRevision(container, local, newRevision);

  return {
    mode: firstTime ? "firstTime" : "push",
    revision: newRevision,
  };
}
