import { createProcessManagementCliContainer } from "@/core/application/container/processManagementCli";
import type { PullProcessManagementOutput } from "@/core/application/processManagement/pullProcessManagement";
import {
  applyPulledProcessManagementMerge,
  pullProcessManagement,
} from "@/core/application/processManagement/pullProcessManagement";
import {
  processArgs,
  resolveProcessAppContainerConfig,
  resolveProcessContainerConfig,
} from "../../processConfig";
import { createPullCommand } from "../pullCommandFactory";

type ProcessMerged = Extract<PullProcessManagementOutput, { mode: "merged" }>;

/** Fixed conflict key for the single (whole-entity) process config. */
const PROCESS_CONFLICT_KEY = "process";

export default createPullCommand<
  Parameters<typeof createProcessManagementCliContainer>[0],
  ReturnType<typeof createProcessManagementCliContainer>,
  Parameters<typeof resolveProcessContainerConfig>[0],
  ProcessMerged
>({
  description:
    "Pull remote process management into the local process config (3-way merge)",
  args: processArgs,
  subject: "process management config",
  conflictNoun: "process",
  createContainer: createProcessManagementCliContainer,
  pullFn: async ({ container, input }) => {
    const result = await pullProcessManagement({ container, input });
    if (result.mode === "merged") {
      return { mode: "merged", merged: result };
    }
    return { mode: result.mode };
  },
  getMergeView: (merged) => ({
    hasConflict: merged.merge.hasConflict,
    conflicts: merged.merge.hasConflict ? [{ key: PROCESS_CONFLICT_KEY }] : [],
  }),
  applyMerge: async ({ container, merged, resolution }) => {
    await applyPulledProcessManagementMerge({
      container,
      input: {
        merge: merged.merge,
        resolution: resolution.get(PROCESS_CONFLICT_KEY),
        remoteConfig: merged.remoteConfig,
        remoteRevision: merged.remoteRevision,
      },
    });
  },
  resolveContainerConfig: resolveProcessContainerConfig,
  resolveAppContainerConfig: resolveProcessAppContainerConfig,
});
