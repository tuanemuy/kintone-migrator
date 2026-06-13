import type { NotificationConfig } from "@/core/domain/notification/entity";
import { NotificationConfigSerializer } from "@/core/domain/notification/services/configSerializer";
import {
  computeNotificationThreeWayMerge,
  type NotificationMergeResolution,
  type NotificationThreeWayMerge,
  resolveNotificationMerge,
} from "@/core/domain/notification/services/notificationMerge";
import type { NotificationServiceArgs } from "../container/notification";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { loadNotificationThreeWayInputs } from "./loadNotificationThreeWayInputs";
import { saveNotificationSnapshotAndRevision } from "./notificationStateIo";

export type PullNotificationInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullNotificationOutput =
  | { readonly mode: "force"; readonly configText: string }
  | { readonly mode: "firstTime"; readonly configText: string }
  | {
      readonly mode: "merged";
      readonly merge: NotificationThreeWayMerge;
      readonly remoteConfig: NotificationConfig;
      readonly remoteRevision: string;
    };

function serializeNotification(
  container: NotificationServiceArgs["container"],
  config: NotificationConfig,
): string {
  return stringifyConfig(
    container.configCodec,
    NotificationConfigSerializer.serialize(config),
  );
}

/**
 * First stage of `notification pull`.
 *
 * - `force`: returns the remote snapshot for local overwrite (capture-equiv).
 * - first run (no state): returns remote for one-way overwrite.
 * - otherwise: computes the bundled 3-way merge and returns it for conflict
 *   resolution by the CLI. The local YAML / state are NOT written here — that
 *   happens in {@link applyPulledNotificationMerge} after resolution, so an
 *   aborted resolution leaves local and state untouched.
 *
 * This stage never writes to the remote (pull is read-only against kintone).
 */
export async function pullNotification({
  container,
  input,
}: NotificationServiceArgs<PullNotificationInput>): Promise<PullNotificationOutput> {
  const { state, local, remote } =
    await loadNotificationThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    // force / first run / no local: one-way overwrite from the remote and
    // (re)initialize the base. The remote is the source of truth here.
    const configText = serializeNotification(container, remote.config);
    await container.notificationStorage.update(configText);
    await saveNotificationSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return {
      mode: input.force ? "force" : "firstTime",
      configText,
    };
  }

  const merge = computeNotificationThreeWayMerge(state, local, remote.config);

  return {
    mode: "merged",
    merge,
    remoteConfig: remote.config,
    remoteRevision: remote.revision,
  };
}

export type ApplyPulledNotificationMergeInput = {
  readonly merge: NotificationThreeWayMerge;
  readonly resolution: NotificationMergeResolution;
  readonly remoteConfig: NotificationConfig;
  readonly remoteRevision: string;
};

/**
 * Second stage of `notification pull`: applies a resolved 3-way merge.
 *
 * Writes the merged config to the local YAML and updates the base to the remote
 * snapshot/revision. Called only after the CLI has fully resolved all conflicts;
 * if the user aborts resolution this is never invoked, so local and state remain
 * unchanged.
 */
export async function applyPulledNotificationMerge({
  container,
  input,
}: NotificationServiceArgs<ApplyPulledNotificationMergeInput>): Promise<{
  readonly configText: string;
}> {
  // resolveNotificationMerge throws a BusinessRuleError when the resolution does
  // not cover every conflict (programmer invariant); translate it to a
  // ValidationError per the error policy (domain → application).
  const merged = wrapBusinessRuleError(() =>
    resolveNotificationMerge(input.merge, input.resolution),
  );
  const configText = serializeNotification(container, merged);
  await container.notificationStorage.update(configText);
  await saveNotificationSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
  return { configText };
}
