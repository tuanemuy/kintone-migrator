import type { PluginsConfig } from "@/core/domain/plugin/entity";
import { PluginStateSerializer } from "@/core/domain/plugin/services/pluginStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { PluginDiffContainer } from "../container/plugin";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the plugins snapshot (state file) and the app revision
 * (`state/<appName>/revision.yaml`) side by side. The two writes are kept
 * together so they always advance as a pair (snapshot → revision, ADR-188-009).
 */
export async function savePluginSnapshotAndRevision(
  container: PluginDiffContainer,
  config: PluginsConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.pluginStateStorage,
    container.configCodec,
    PluginStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
