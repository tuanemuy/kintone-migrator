import { createRecordPermissionCliContainer } from "@/core/application/container/recordPermissionCli";
import type { PullRecordPermissionOutput } from "@/core/application/recordPermission/pullRecordPermission";
import {
  applyPulledRecordPermissionMerge,
  pullRecordPermission,
} from "@/core/application/recordPermission/pullRecordPermission";
import {
  recordAclArgs,
  resolveRecordAclAppContainerConfig,
  resolveRecordAclContainerConfig,
} from "../../recordAclConfig";
import { createPullCommand } from "../pullCommandFactory";

type RecordAclMerged = Extract<PullRecordPermissionOutput, { mode: "merged" }>;

export default createPullCommand<
  Parameters<typeof createRecordPermissionCliContainer>[0],
  ReturnType<typeof createRecordPermissionCliContainer>,
  Parameters<typeof resolveRecordAclContainerConfig>[0],
  RecordAclMerged
>({
  description:
    "Pull remote record permissions into the local record-acl config (3-way merge)",
  args: recordAclArgs,
  subject: "record permission config",
  conflictNoun: "record permission",
  createContainer: createRecordPermissionCliContainer,
  pullFn: async ({ container, input }) => {
    const result = await pullRecordPermission({ container, input });
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
    await applyPulledRecordPermissionMerge({
      container,
      input: {
        merge: merged.merge,
        resolution,
        remoteConfig: merged.remoteConfig,
        remoteRevision: merged.remoteRevision,
      },
    });
  },
  resolveContainerConfig: resolveRecordAclContainerConfig,
  resolveAppContainerConfig: resolveRecordAclAppContainerConfig,
});
