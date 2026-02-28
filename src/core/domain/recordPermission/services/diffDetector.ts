import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
import type { RecordPermissionConfig, RecordRight } from "../entity";
import type {
  RecordPermissionDiff,
  RecordPermissionDiffEntry,
} from "../valueObject";

function areRightsEqual(a: RecordRight, b: RecordRight): boolean {
  return deepEqual(
    {
      filterCond: a.filterCond,
      entities: a.entities.map((e) => ({
        type: e.entity.type,
        code: e.entity.code,
        viewable: e.viewable,
        editable: e.editable,
        deletable: e.deletable,
        includeSubs: e.includeSubs,
      })),
    },
    {
      filterCond: b.filterCond,
      entities: b.entities.map((e) => ({
        type: e.entity.type,
        code: e.entity.code,
        viewable: e.viewable,
        editable: e.editable,
        deletable: e.deletable,
        includeSubs: e.includeSubs,
      })),
    },
  );
}

/**
 * Groups rights by filterCond. Multiple rights can share the same filterCond,
 * so rights within a group are compared by position (index-based matching).
 */
function buildMultiMap(
  rights: readonly RecordRight[],
): Map<string, RecordRight[]> {
  const map = new Map<string, RecordRight[]>();
  for (const right of rights) {
    const existing = map.get(right.filterCond);
    if (existing) {
      existing.push(right);
    } else {
      map.set(right.filterCond, [right]);
    }
  }
  return map;
}

function describeRight(right: RecordRight): string {
  return `entities: ${right.entities.length}`;
}

export const RecordPermissionDiffDetector = {
  detect: (
    local: RecordPermissionConfig,
    remote: RecordPermissionConfig,
  ): RecordPermissionDiff => {
    const entries: RecordPermissionDiffEntry[] = [];

    const localMulti = buildMultiMap(local.rights);
    const remoteMulti = buildMultiMap(remote.rights);

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
