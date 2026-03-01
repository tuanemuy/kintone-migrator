import { deepEqual } from "@/lib/deepEqual";
import { groupByKey } from "@/lib/groupByKey";
import { buildDiffResult } from "../../diff";
import type { RecordPermissionConfig, RecordRight } from "../entity";
import type {
  RecordPermissionDiff,
  RecordPermissionDiffEntry,
} from "../valueObject";

// filterCond is already used as the grouping key in detect(), so it is
// excluded from the equality check here to avoid redundant comparison.
function areRightsEqual(a: RecordRight, b: RecordRight): boolean {
  return deepEqual(
    a.entities.map((e) => ({
      type: e.entity.type,
      code: e.entity.code,
      viewable: e.viewable,
      editable: e.editable,
      deletable: e.deletable,
      includeSubs: e.includeSubs,
    })),
    b.entities.map((e) => ({
      type: e.entity.type,
      code: e.entity.code,
      viewable: e.viewable,
      editable: e.editable,
      deletable: e.deletable,
      includeSubs: e.includeSubs,
    })),
  );
}

function describeRight(right: RecordRight): string {
  return `entities: ${right.entities.length}`;
}

export const RecordPermissionDiffDetector = {
  // Partially order-sensitive: rights are grouped by filterCond, and within
  // each group, positional comparison is used (order matters). Across groups,
  // order does not matter since each filterCond is an independent rule set.
  detect: (
    local: RecordPermissionConfig,
    remote: RecordPermissionConfig,
  ): RecordPermissionDiff => {
    const entries: RecordPermissionDiffEntry[] = [];

    const localMulti = groupByKey(local.rights, (r) => r.filterCond);
    const remoteMulti = groupByKey(remote.rights, (r) => r.filterCond);

    for (const [filterCond, localRights] of localMulti) {
      const remoteRights = remoteMulti.get(filterCond) ?? [];
      const maxLen = Math.max(localRights.length, remoteRights.length);

      for (let i = 0; i < maxLen; i++) {
        const localRight = localRights[i];
        const remoteRight = remoteRights[i];

        if (localRight && !remoteRight) {
          entries.push({
            type: "added",
            filterCond,
            details: describeRight(localRight),
          });
        } else if (!localRight && remoteRight) {
          entries.push({
            type: "deleted",
            filterCond,
            details: describeRight(remoteRight),
          });
        } else if (localRight && remoteRight) {
          if (!areRightsEqual(localRight, remoteRight)) {
            const diffs: string[] = [];
            if (localRight.entities.length !== remoteRight.entities.length) {
              diffs.push(
                `entities: ${remoteRight.entities.length} -> ${localRight.entities.length}`,
              );
            } else {
              diffs.push("entities changed");
            }
            entries.push({
              type: "modified",
              filterCond,
              details: diffs.join(", "),
            });
          }
        }
      }
    }

    // Check for filterConds that only exist in remote
    for (const [filterCond, remoteRights] of remoteMulti) {
      if (!localMulti.has(filterCond)) {
        for (const remoteRight of remoteRights) {
          entries.push({
            type: "deleted",
            filterCond,
            details: describeRight(remoteRight),
          });
        }
      }
    }

    return buildDiffResult(entries);
  },
};
