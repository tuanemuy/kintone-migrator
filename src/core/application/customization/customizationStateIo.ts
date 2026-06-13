import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationStateSerializer } from "@/core/domain/customization/services/customizationStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { CustomizationThreeWayContainer } from "../container/customization";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the customization snapshot (state file) and the app
 * revision (`state/<appName>/revision.yaml`) side by side. The two writes are
 * kept together so they always advance as a pair (snapshot → revision).
 */
export async function saveCustomizationSnapshotAndRevision(
  container: CustomizationThreeWayContainer,
  config: CustomizationConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.customizationStateStorage,
    container.configCodec,
    CustomizationStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
