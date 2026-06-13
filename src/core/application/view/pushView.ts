import { computeViewThreeWayMerge } from "@/core/domain/view/services/viewMerge";
import type { ViewServiceArgs } from "../container/view";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { loadViewThreeWayInputs } from "./loadViewThreeWayInputs";
import { prepareViewsForUpdate } from "./prepareViewsForUpdate";
import { saveViewSnapshotAndRevision } from "./viewStateIo";

export type PushViewInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

export type PushViewOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
  readonly skippedBuiltinViews: readonly string[];
};

/** Pull command name surfaced in the drift hint message. */
const VIEW_PULL_COMMAND = "view pull";

/**
 * Applies the local view config to the remote with drift detection and
 * optimistic concurrency control.
 *
 * - Loads base/local/remote (the remote carries its own revision).
 * - drift (remoteOnly or conflict entries) && !force → {@link buildDriftConflict}
 *   tagged with `ConfigDrift`, distinguished from API optimistic-lock conflicts
 *   by error code.
 * - otherwise replaces the views, sending the observed remote revision as the
 *   expected revision (TOCTOU guard). `--force` / first run send
 *   no revision (kintone skips the revision check).
 *
 * Deploy is performed by the CLI (`confirmAndDeploy`). State records the local
 * config and the post-apply revision as the new base (snapshot → revision).
 */
export async function pushView({
  container,
  input,
}: ViewServiceArgs<PushViewInput>): Promise<PushViewOutput> {
  const { state, local, remote } = await loadViewThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "View config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computeViewThreeWayMerge(state, local, remote.config);
    const hasDrift = merge.entries.some(
      (e) => e.change.kind === "remoteOnly" || e.change.kind === "conflict",
    );
    if (hasDrift) {
      throw buildDriftConflict(VIEW_PULL_COMMAND);
    }
  }

  const { views, skippedBuiltinViews } = prepareViewsForUpdate(
    local.views,
    remote.config.views,
  );

  // Expected revision: the observed remote revision guards against
  // TOCTOU on a normal push. `--force` / first run omit it so the apply does not
  // fail on an unrelated concurrent change (kintone skips the revision check
  // when revision is undefined — verified against the view adapter).
  const expectedRevision =
    input.force || firstTime ? undefined : remote.revision;

  const { revision: newRevision } =
    await container.viewConfigurator.updateViews({
      views,
      ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
    });

  await saveViewSnapshotAndRevision(container, local, newRevision);

  return {
    mode: firstTime ? "firstTime" : "push",
    revision: newRevision,
    skippedBuiltinViews,
  };
}
