import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import { GeneralSettingsStateSerializer } from "@/core/domain/generalSettings/services/generalSettingsStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { GeneralSettingsDiffContainer } from "../container/generalSettings";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the settings snapshot (state file) and the app revision
 * (`state/<appName>/revision.yaml`) side by side. The two writes are kept
 * together so they always advance as a pair (snapshot → revision, ADR-188-009).
 */
export async function saveGeneralSettingsSnapshotAndRevision(
  container: GeneralSettingsDiffContainer,
  config: GeneralSettingsConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.generalSettingsStateStorage,
    container.configCodec,
    GeneralSettingsStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
