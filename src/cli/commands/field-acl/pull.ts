import { createFieldPermissionCliContainer } from "@/core/application/container/fieldPermissionCli";
import type { PullFieldPermissionOutput } from "@/core/application/fieldPermission/pullFieldPermission";
import {
  applyPulledFieldPermissionMerge,
  pullFieldPermission,
} from "@/core/application/fieldPermission/pullFieldPermission";
import {
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../../fieldAclConfig";
import { createPullCommand } from "../pullCommandFactory";

type FieldAclMerged = Extract<PullFieldPermissionOutput, { mode: "merged" }>;

export default createPullCommand<
  Parameters<typeof createFieldPermissionCliContainer>[0],
  ReturnType<typeof createFieldPermissionCliContainer>,
  Parameters<typeof resolveFieldAclContainerConfig>[0],
  FieldAclMerged
>({
  description:
    "Pull remote field permissions into the local field-acl config (3-way merge)",
  args: fieldAclArgs,
  subject: "field permission config",
  conflictNoun: "field permission",
  createContainer: createFieldPermissionCliContainer,
  pullFn: async ({ container, input }) => {
    const result = await pullFieldPermission({ container, input });
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
    await applyPulledFieldPermissionMerge({
      container,
      input: {
        merge: merged.merge,
        resolution,
        remoteConfig: merged.remoteConfig,
        remoteRevision: merged.remoteRevision,
      },
    });
  },
  resolveContainerConfig: resolveFieldAclContainerConfig,
  resolveAppContainerConfig: resolveFieldAclAppContainerConfig,
});
