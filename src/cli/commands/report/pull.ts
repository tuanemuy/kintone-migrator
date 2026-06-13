import { createReportCliContainer } from "@/core/application/container/reportCli";
import type { PullReportOutput } from "@/core/application/report/pullReport";
import {
  applyPulledReportMerge,
  pullReport,
} from "@/core/application/report/pullReport";
import {
  reportArgs,
  resolveReportAppContainerConfig,
  resolveReportContainerConfig,
} from "../../reportConfig";
import { createPullCommand } from "../pullCommandFactory";

type ReportMerged = Extract<PullReportOutput, { mode: "merged" }>;

export default createPullCommand<
  Parameters<typeof createReportCliContainer>[0],
  ReturnType<typeof createReportCliContainer>,
  Parameters<typeof resolveReportContainerConfig>[0],
  ReportMerged
>({
  description: "Pull remote reports into the local report config (3-way merge)",
  args: reportArgs,
  subject: "report config",
  conflictNoun: "report",
  createContainer: createReportCliContainer,
  pullFn: async ({ container, input }) => {
    const result = await pullReport({ container, input });
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
    await applyPulledReportMerge({
      container,
      input: {
        merge: merged.merge,
        resolution,
        remoteConfig: merged.remoteConfig,
        remoteRevision: merged.remoteRevision,
      },
    });
  },
  resolveContainerConfig: resolveReportContainerConfig,
  resolveAppContainerConfig: resolveReportAppContainerConfig,
});
