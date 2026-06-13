import { createViewCliContainer } from "@/core/application/container/viewCli";
import type { PullViewOutput } from "@/core/application/view/pullView";
import {
  applyPulledViewMerge,
  pullView,
} from "@/core/application/view/pullView";
import {
  resolveViewAppContainerConfig,
  resolveViewContainerConfig,
  viewArgs,
} from "../../viewConfig";
import { createPullCommand } from "../pullCommandFactory";

type ViewMerged = Extract<PullViewOutput, { mode: "merged" }>;

export default createPullCommand<
  Parameters<typeof createViewCliContainer>[0],
  ReturnType<typeof createViewCliContainer>,
  Parameters<typeof resolveViewContainerConfig>[0],
  ViewMerged
>({
  description: "Pull remote views into the local view config (3-way merge)",
  args: viewArgs,
  subject: "view config",
  conflictNoun: "view",
  createContainer: createViewCliContainer,
  pullFn: async ({ container, input }) => {
    const result = await pullView({ container, input });
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
    await applyPulledViewMerge({
      container,
      input: {
        merge: merged.merge,
        resolution,
        remoteConfig: merged.remoteConfig,
        remoteRevision: merged.remoteRevision,
      },
    });
  },
  resolveContainerConfig: resolveViewContainerConfig,
  resolveAppContainerConfig: resolveViewAppContainerConfig,
});
