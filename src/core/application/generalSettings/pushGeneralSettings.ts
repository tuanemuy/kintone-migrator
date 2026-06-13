import { computeGeneralSettingsThreeWayMerge } from "@/core/domain/generalSettings/services/generalSettingsMerge";
import type { GeneralSettingsServiceArgs } from "../container/generalSettings";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { saveGeneralSettingsSnapshotAndRevision } from "./generalSettingsStateIo";
import { loadGeneralSettingsThreeWayInputs } from "./loadGeneralSettingsThreeWayInputs";

export type PushGeneralSettingsInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

export type PushGeneralSettingsOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
};

/** Pull command name surfaced in the drift hint message. */
const SETTINGS_PULL_COMMAND = "settings pull";

/**
 * Applies the local general settings config to the remote with drift detection
 * and optimistic concurrency control, as a whole-entity 3-way push.
 *
 * - Loads base/local/remote (the remote carries its own revision).
 * - drift (`remoteOnly` or `conflict`) && !force → {@link buildDriftConflict}
 *   tagged with `ConfigDrift`, distinguished from API optimistic-lock conflicts
 *   by error code.
 * - otherwise replaces the settings, sending the observed remote revision as the
 *   expected revision (TOCTOU guard). `--force` / first run send no
 *   revision (kintone skips the revision check).
 */
export async function pushGeneralSettings({
  container,
  input,
}: GeneralSettingsServiceArgs<PushGeneralSettingsInput>): Promise<PushGeneralSettingsOutput> {
  const { state, local, remote } =
    await loadGeneralSettingsThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "General settings config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computeGeneralSettingsThreeWayMerge(
      state,
      local,
      remote.config,
    );
    if (
      merge.change.kind === "remoteOnly" ||
      merge.change.kind === "conflict"
    ) {
      throw buildDriftConflict(SETTINGS_PULL_COMMAND);
    }
  }

  const expectedRevision =
    input.force || firstTime ? undefined : remote.revision;

  const { revision: newRevision } =
    await container.generalSettingsConfigurator.updateGeneralSettings({
      config: local,
      ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
    });

  await saveGeneralSettingsSnapshotAndRevision(container, local, newRevision);

  return {
    mode: firstTime ? "firstTime" : "push",
    revision: newRevision,
  };
}
