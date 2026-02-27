import { buildDiffResult } from "../../diff";
import type { RecordPermissionConfig, RecordRight } from "../entity";
import type { RecordPermissionDiffEntry } from "../valueObject";

function serializeRight(right: RecordRight): string {
  return JSON.stringify({
    filterCond: right.filterCond,
    entities: right.entities.map((e) => ({
      type: e.entity.type,
      code: e.entity.code,
      viewable: e.viewable,
      editable: e.editable,
      deletable: e.deletable,
      includeSubs: e.includeSubs,
    })),
  });
}

export const RecordPermissionDiffDetector = {
  detect: (local: RecordPermissionConfig, remote: RecordPermissionConfig) => {
    const entries: RecordPermissionDiffEntry[] = [];

    const localMap = new Map(local.rights.map((r) => [r.filterCond, r]));
    const remoteMap = new Map(remote.rights.map((r) => [r.filterCond, r]));

    for (const [filterCond, localRight] of localMap) {
      const remoteRight = remoteMap.get(filterCond);
      if (!remoteRight) {
        entries.push({
          type: "added",
          filterCond,
          details: `entities: ${localRight.entities.length}`,
        });
      } else if (serializeRight(localRight) !== serializeRight(remoteRight)) {
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

    for (const [filterCond, remoteRight] of remoteMap) {
      if (!localMap.has(filterCond)) {
        entries.push({
          type: "deleted",
          filterCond,
          details: `entities: ${remoteRight.entities.length}`,
        });
      }
    }

    return buildDiffResult(entries);
  },
};
