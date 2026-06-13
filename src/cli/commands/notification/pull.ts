import { createNotificationCliContainer } from "@/core/application/container/notificationCli";
import type { PullNotificationOutput } from "@/core/application/notification/pullNotification";
import {
  applyPulledNotificationMerge,
  pullNotification,
} from "@/core/application/notification/pullNotification";
import {
  notificationArgs,
  resolveNotificationAppContainerConfig,
  resolveNotificationContainerConfig,
} from "../../notificationConfig";
import { createPullCommand } from "../pullCommandFactory";

type NotificationMerged = Extract<PullNotificationOutput, { mode: "merged" }>;

export default createPullCommand<
  Parameters<typeof createNotificationCliContainer>[0],
  ReturnType<typeof createNotificationCliContainer>,
  Parameters<typeof resolveNotificationContainerConfig>[0],
  NotificationMerged
>({
  description:
    "Pull remote notifications into the local notification config (3-way merge)",
  args: notificationArgs,
  subject: "notification config",
  conflictNoun: "notification",
  createContainer: createNotificationCliContainer,
  pullFn: async ({ container, input }) => {
    const result = await pullNotification({ container, input });
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
    await applyPulledNotificationMerge({
      container,
      input: {
        merge: merged.merge,
        resolution,
        remoteConfig: merged.remoteConfig,
        remoteRevision: merged.remoteRevision,
      },
    });
  },
  resolveContainerConfig: resolveNotificationContainerConfig,
  resolveAppContainerConfig: resolveNotificationAppContainerConfig,
});
