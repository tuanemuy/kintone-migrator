import type { RecordPermissionConfig, RecordRight } from "../entity";
import type {
  RecordPermissionDiff,
  RecordPermissionDiffEntry,
} from "../valueObject";

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
  detect: (
    local: RecordPermissionConfig,
    remote: RecordPermissionConfig,
  ): RecordPermissionDiff => {
    const entries: RecordPermissionDiffEntry[] = [];

    const maxLen = Math.max(local.rights.length, remote.rights.length);

    for (let i = 0; i < maxLen; i++) {
      const localRight = local.rights[i];
      const remoteRight = remote.rights[i];

      if (localRight && !remoteRight) {
        entries.push({
          type: "added",
          index: i,
          details: `filterCond: "${localRight.filterCond}", entities: ${localRight.entities.length}`,
        });
      } else if (!localRight && remoteRight) {
        entries.push({
          type: "deleted",
          index: i,
          details: `filterCond: "${remoteRight.filterCond}", entities: ${remoteRight.entities.length}`,
        });
      } else if (
        localRight &&
        remoteRight &&
        serializeRight(localRight) !== serializeRight(remoteRight)
      ) {
        const diffs: string[] = [];
        if (localRight.filterCond !== remoteRight.filterCond) {
          diffs.push("filterCond changed");
        }
        if (localRight.entities.length !== remoteRight.entities.length) {
          diffs.push(
            `entities: ${remoteRight.entities.length} -> ${localRight.entities.length}`,
          );
        } else {
          diffs.push("entities changed");
        }
        entries.push({
          type: "modified",
          index: i,
          details: diffs.join(", "),
        });
      }
    }

    const added = entries.filter((e) => e.type === "added").length;
    const modified = entries.filter((e) => e.type === "modified").length;
    const deleted = entries.filter((e) => e.type === "deleted").length;

    return {
      entries,
      summary: { added, modified, deleted, total: added + modified + deleted },
      isEmpty: entries.length === 0,
    };
  },
};
