import type { PullAppPermissionOutput } from "@/core/application/appPermission/pullAppPermission";
import {
  applyPulledAppPermissionMerge,
  pullAppPermission,
} from "@/core/application/appPermission/pullAppPermission";
import { createAppPermissionCliContainer } from "@/core/application/container/appPermissionCli";
import {
  appAclArgs,
  resolveAppAclAppContainerConfig,
  resolveAppAclContainerConfig,
} from "../../appAclConfig";
import { createPullCommand } from "../pullCommandFactory";

type AppAclMerged = Extract<PullAppPermissionOutput, { mode: "merged" }>;

export default createPullCommand<
  Parameters<typeof createAppPermissionCliContainer>[0],
  ReturnType<typeof createAppPermissionCliContainer>,
  Parameters<typeof resolveAppAclContainerConfig>[0],
  AppAclMerged
>({
  description:
    "Pull remote app permissions into the local app-acl config (3-way merge)",
  args: appAclArgs,
  subject: "app permission config",
  conflictNoun: "app permission",
  createContainer: createAppPermissionCliContainer,
  pullFn: async ({ container, input }) => {
    const result = await pullAppPermission({ container, input });
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
    await applyPulledAppPermissionMerge({
      container,
      input: {
        merge: merged.merge,
        resolution,
        remoteConfig: merged.remoteConfig,
        remoteRevision: merged.remoteRevision,
      },
    });
  },
  resolveContainerConfig: resolveAppAclContainerConfig,
  resolveAppContainerConfig: resolveAppAclAppContainerConfig,
});
