import { deepEqual } from "@/lib/deepEqual";
import { pairByKeyInOrder } from "@/lib/pairByKeyInOrder";
import { buildDiffResult } from "../../diff";
import type { RecordPermissionConfig, RecordRight } from "../entity";
import type {
  RecordPermissionDiff,
  RecordPermissionDiffEntry,
} from "../valueObject";

// filterCond is already used as the grouping key in detect(), so it is
// excluded from the equality check here to avoid redundant comparison.
function isRightEqual(a: RecordRight, b: RecordRight): boolean {
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
  const perEntity = right.entities.map((e) => {
    const perms = [
      e.viewable ? "view" : null,
      e.editable ? "edit" : null,
      e.deletable ? "delete" : null,
    ]
      .filter(Boolean)
      .join("/");
    return `${e.entity.type}:${e.entity.code}(${perms || "none"})`;
  });
  return perEntity.length > 0 ? perEntity.join(", ") : "no entities";
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

    for (const pair of pairByKeyInOrder(
      local.rights,
      remote.rights,
      (r) => r.filterCond,
    )) {
      const filterCond = pair.key;
      switch (pair.kind) {
        case "localOnly":
          entries.push({
            type: "added",
            filterCond,
            details: describeRight(pair.local),
          });
          break;
        case "remoteOnly":
          entries.push({
            type: "deleted",
            filterCond,
            details: describeRight(pair.remote),
          });
          break;
        case "both":
          if (!isRightEqual(pair.local, pair.remote)) {
            const detail =
              pair.local.entities.length !== pair.remote.entities.length
                ? `entities: ${pair.remote.entities.length} -> ${pair.local.entities.length}`
                : `entities: ${describeRight(pair.remote)} -> ${describeRight(pair.local)}`;
            entries.push({
              type: "modified",
              filterCond,
              details: detail,
            });
          }
          break;
      }
    }

    return buildDiffResult(entries);
  },
};
