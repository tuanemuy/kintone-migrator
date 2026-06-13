import type { PullActionOutput } from "@/core/application/action/pullAction";
import {
  applyPulledActionMerge,
  pullAction,
} from "@/core/application/action/pullAction";
import { createActionCliContainer } from "@/core/application/container/actionCli";
import {
  actionArgs,
  resolveActionAppContainerConfig,
  resolveActionContainerConfig,
} from "../../actionConfig";
import { createPullCommand } from "../pullCommandFactory";

type ActionMerged = Extract<PullActionOutput, { mode: "merged" }>;

export default createPullCommand<
  Parameters<typeof createActionCliContainer>[0],
  ReturnType<typeof createActionCliContainer>,
  Parameters<typeof resolveActionContainerConfig>[0],
  ActionMerged
>({
  description: "Pull remote actions into the local action config (3-way merge)",
  args: actionArgs,
  subject: "action config",
  conflictNoun: "action",
  createContainer: createActionCliContainer,
  pullFn: async ({ container, input }) => {
    const result = await pullAction({ container, input });
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
    await applyPulledActionMerge({
      container,
      input: {
        merge: merged.merge,
        resolution,
        remoteConfig: merged.remoteConfig,
        remoteRevision: merged.remoteRevision,
      },
    });
  },
  resolveContainerConfig: resolveActionContainerConfig,
  resolveAppContainerConfig: resolveActionAppContainerConfig,
});
