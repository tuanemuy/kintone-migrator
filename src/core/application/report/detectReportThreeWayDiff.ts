import { computeReportThreeWayMerge } from "@/core/domain/report/services/reportMerge";
import type { ReportDiff } from "@/core/domain/report/valueObject";
import type { ReportDiffServiceArgs } from "../container/report";
import {
  buildRecordThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectReportDiff } from "./detectReportDiff";
import { loadReportThreeWayInputs } from "./loadReportThreeWayInputs";

export type DetectReportThreeWayDiffOutput = ThreeWayDiffResult<ReportDiff>;

/**
 * Detects report differences with 3-way awareness (AC-5).
 *
 * When a state (base snapshot) exists, classifies changes into local-only,
 * remote drift, and conflicts via the record-keyed merge. When no state exists,
 * returns a two-way result carrying the existing 2-way `detectReportDiff`, which
 * the CLI renders with its 2-way printer (the 3-way printer stays generic).
 */
export async function detectReportThreeWayDiff({
  container,
}: ReportDiffServiceArgs): Promise<DetectReportThreeWayDiffOutput> {
  const { state, local, remote } = await loadReportThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectReportDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeReportThreeWayMerge(state, local, remote.config);

  return buildRecordThreeWayDiff(merge, (entry) => {
    const report = entry.local ?? entry.remote ?? entry.base;
    return report?.chartType ?? "";
  });
}
