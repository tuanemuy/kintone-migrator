import type { FieldPermissionConfig, FieldRight } from "../entity";
import type {
  FieldPermissionDiff,
  FieldPermissionDiffEntry,
} from "../valueObject";

function serializeRight(right: FieldRight): string {
  return JSON.stringify(
    right.entities.map((e) => ({
      accessibility: e.accessibility,
      type: e.entity.type,
      code: e.entity.code,
      includeSubs: e.includeSubs,
    })),
  );
}

export const FieldPermissionDiffDetector = {
  detect: (
    local: FieldPermissionConfig,
    remote: FieldPermissionConfig,
  ): FieldPermissionDiff => {
    const entries: FieldPermissionDiffEntry[] = [];

    const localMap = new Map(local.rights.map((r) => [r.code, r]));
    const remoteMap = new Map(remote.rights.map((r) => [r.code, r]));

    for (const [code, localRight] of localMap) {
      const remoteRight = remoteMap.get(code);
      if (!remoteRight) {
        entries.push({
          type: "added",
          fieldCode: code,
          details: `${localRight.entities.length} entities`,
        });
      } else if (serializeRight(localRight) !== serializeRight(remoteRight)) {
        entries.push({
          type: "modified",
          fieldCode: code,
          details: "entities changed",
        });
      }
    }

    for (const code of remoteMap.keys()) {
      if (!localMap.has(code)) {
        entries.push({
          type: "deleted",
          fieldCode: code,
          details: "removed",
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
