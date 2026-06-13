import { createPluginCliContainer } from "@/core/application/container/pluginCli";
import type { PullPluginOutput } from "@/core/application/plugin/pullPlugin";
import {
  applyPulledPluginMerge,
  pullPlugin,
} from "@/core/application/plugin/pullPlugin";
import {
  pluginArgs,
  resolvePluginAppContainerConfig,
  resolvePluginContainerConfig,
} from "../../pluginConfig";
import { createPullCommand } from "../pullCommandFactory";

type PluginMerged = Extract<PullPluginOutput, { mode: "merged" }>;

export default createPullCommand<
  Parameters<typeof createPluginCliContainer>[0],
  ReturnType<typeof createPluginCliContainer>,
  Parameters<typeof resolvePluginContainerConfig>[0],
  PluginMerged
>({
  description: "Pull remote plugins into the local plugin config (3-way merge)",
  args: pluginArgs,
  subject: "plugin config",
  conflictNoun: "plugin",
  createContainer: createPluginCliContainer,
  pullFn: async ({ container, input }) => {
    const result = await pullPlugin({ container, input });
    if (result.mode === "merged") {
      return { mode: "merged", merged: result };
    }
    return { mode: result.mode };
  },
  getMergeView: (merged) => ({
    hasConflict: merged.merge.hasConflict,
    conflicts: merged.merge.conflicts,
  }),
  applyMerge: async ({ container, merged, resolution }) => {
    await applyPulledPluginMerge({
      container,
      input: {
        merge: merged.merge,
        resolution,
        remoteConfig: merged.remoteConfig,
        remoteRevision: merged.remoteRevision,
      },
    });
  },
  resolveContainerConfig: resolvePluginContainerConfig,
  resolveAppContainerConfig: resolvePluginAppContainerConfig,
});
