import { computePluginThreeWayMerge } from "@/core/domain/plugin/services/pluginMerge";
import type { PluginDiff } from "@/core/domain/plugin/valueObject";
import type { PluginDiffServiceArgs } from "../container/plugin";
import {
  buildRecordThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectPluginDiff } from "./detectPluginDiff";
import { loadPluginThreeWayInputs } from "./loadPluginThreeWayInputs";

export type DetectPluginThreeWayDiffOutput = ThreeWayDiffResult<PluginDiff>;

/**
 * Detects plugin differences with 3-way awareness (AC-8).
 *
 * When a state (base snapshot) exists, classifies changes into local-only,
 * remote drift, and conflicts via the record-keyed merge (keyed by plugin id).
 * When no state exists, returns a two-way result carrying the existing 2-way
 * `detectPluginDiff`, which the CLI renders with its 2-way printer (the 3-way
 * printer stays generic).
 */
export async function detectPluginThreeWayDiff({
  container,
}: PluginDiffServiceArgs): Promise<DetectPluginThreeWayDiffOutput> {
  const { state, local, remote } = await loadPluginThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectPluginDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computePluginThreeWayMerge(state, local, remote.config);

  return buildRecordThreeWayDiff(merge, (entry) => {
    const plugin = entry.local ?? entry.remote ?? entry.base;
    return plugin?.name ?? entry.key;
  });
}
