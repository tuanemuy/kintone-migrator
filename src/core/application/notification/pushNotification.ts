import type { NotificationConfig } from "@/core/domain/notification/entity";
import { computeNotificationThreeWayMerge } from "@/core/domain/notification/services/notificationMerge";
import type { NotificationServiceArgs } from "../container/notification";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { loadNotificationThreeWayInputs } from "./loadNotificationThreeWayInputs";
import { saveNotificationSnapshotAndRevision } from "./notificationStateIo";

export type PushNotificationInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

export type PushNotificationOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
};

/** Pull command name surfaced in the drift hint message. */
const NOTIFICATION_PULL_COMMAND = "notification pull";

/**
 * Applies the local notification config to the remote with drift detection and
 * optimistic concurrency control.
 *
 * Notification bundles three sub-configs (general / perRecord / reminder) that
 * kintone updates via three independent APIs but that share a single app-scoped
 * revision. The flow is:
 *
 * 1. Load base/local/remote once and compute the bundled 3-way merge.
 * 2. drift (any `remoteOnly`/`conflict` entry, or a `remoteOnly`/`conflict`
 *    scalar) && !force → {@link buildDriftConflict} tagged with `ConfigDrift`.
 * 3. Apply the three `update*` in sequence. Each apply advances the revision, so
 *    the first observed revision is sent to the first update and each subsequent
 *    update is sent the previous response's revision (TOCTOU within the
 *    sequence). `--force` / first run send no revision (kintone skips the check).
 *
 * **Partial-application residue:** if a later `update*` drifts or
 * fails, the earlier applies are already committed on kintone and cannot be
 * rolled back. To keep re-runs idempotent, the base/state is updated **only
 * after all three updates succeed**: on a mid-sequence failure the base is left
 * untouched, so a re-run sees the already-applied sections as no-op diffs and
 * continues cleanly.
 *
 * Only sections present in the local config are pushed (mirrors
 * `applyNotification`); omitted sections keep the remote value in the new base.
 */
export async function pushNotification({
  container,
  input,
}: NotificationServiceArgs<PushNotificationInput>): Promise<PushNotificationOutput> {
  const { state, local, remote } =
    await loadNotificationThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Notification config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computeNotificationThreeWayMerge(state, local, remote.config);
    // Only the sections the local config manages are pushed, so only their
    // remote drift can be overwritten or lost. Drift in a section the local
    // config omits (e.g. local has no `reminder`) is not this push's concern —
    // it is taken into the base verbatim and surfaced later by `pull`. Scoping
    // the drift check to managed sections avoids blocking a push because of a
    // remote change in an unmanaged section.
    const isManaged = (key: string): boolean => {
      if (key.startsWith("general:")) return local.general !== undefined;
      if (key.startsWith("perRecord:")) return local.perRecord !== undefined;
      if (key.startsWith("reminder:")) return local.reminder !== undefined;
      return false;
    };
    const isDriftKind = (kind: string): boolean =>
      kind === "remoteOnly" || kind === "conflict";
    const hasDrift =
      merge.entries.some(
        (e) => isManaged(e.key) && isDriftKind(e.change.kind),
      ) ||
      (local.general !== undefined &&
        isDriftKind(merge.generalScalar.change.kind)) ||
      (local.reminder !== undefined &&
        isDriftKind(merge.reminderTimezone.change.kind));
    if (hasDrift) {
      throw buildDriftConflict(NOTIFICATION_PULL_COMMAND);
    }
  }

  // Expected revision: the observed remote revision guards the
  // first update against TOCTOU; `--force` / first run omit it. Each successful
  // update advances the revision, which is threaded into the next update.
  const sendRevision = !(input.force || firstTime);
  let revision = remote.revision;

  // Track which sections this push actually wrote, so the new base keeps the
  // remote value for any section the local config omitted.
  const newBase: {
    general: NotificationConfig["general"];
    perRecord: NotificationConfig["perRecord"];
    reminder: NotificationConfig["reminder"];
  } = {
    general: remote.config.general,
    perRecord: remote.config.perRecord,
    reminder: remote.config.reminder,
  };

  if (local.general !== undefined) {
    const res =
      await container.notificationConfigurator.updateGeneralNotifications({
        notifyToCommenter: local.general.notifyToCommenter,
        notifications: local.general.notifications,
        ...(sendRevision ? { revision } : {}),
      });
    revision = res.revision;
    newBase.general = local.general;
  }

  if (local.perRecord !== undefined) {
    const res =
      await container.notificationConfigurator.updatePerRecordNotifications({
        notifications: local.perRecord,
        ...(sendRevision ? { revision } : {}),
      });
    revision = res.revision;
    newBase.perRecord = local.perRecord;
  }

  if (local.reminder !== undefined) {
    const res =
      await container.notificationConfigurator.updateReminderNotifications({
        timezone: local.reminder.timezone,
        notifications: local.reminder.notifications,
        ...(sendRevision ? { revision } : {}),
      });
    revision = res.revision;
    newBase.reminder = local.reminder;
  }

  // All updates succeeded: now (and only now) persist the new base so a
  // mid-sequence failure leaves the base untouched and re-runs stay idempotent.
  await saveNotificationSnapshotAndRevision(container, newBase, revision);

  return {
    mode: firstTime ? "firstTime" : "push",
    revision,
  };
}
