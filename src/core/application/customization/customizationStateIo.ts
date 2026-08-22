import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationStateSerializer } from "@/core/domain/customization/services/customizationStateSerializer";
import type { CustomizationFileDigests } from "@/core/domain/customization/valueObject";
import { saveAppRevision } from "../appRevisionIo";
import type { CustomizationThreeWayContainer } from "../container/customization";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the customization snapshot (config + FILE content
 * digests) and the app revision (`state/<appName>/revision.yaml`) side by side.
 * The two writes are kept together so they always advance as a pair
 * (snapshot → revision).
 *
 * `fileDigests` is computed by the caller rather than here: this function runs
 * after `updateCustomization` (it needs the resulting revision), while push must
 * digest its files *before* uploading them, and pull's merge path records the
 * remote's digests rather than what is on disk. Keeping the parameter required
 * still makes a digest-less snapshot impossible to write by accident.
 */
export async function saveCustomizationSnapshotAndRevision(
  container: CustomizationThreeWayContainer,
  config: CustomizationConfig,
  fileDigests: CustomizationFileDigests,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.customizationStateStorage,
    container.configCodec,
    CustomizationStateSerializer.serialize,
    { config, fileDigests },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
