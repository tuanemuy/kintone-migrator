import { buildDiffResult, deepEqual } from "../../diff";
import type { FieldPermissionConfig, FieldRight } from "../entity";
import type { FieldPermissionDiffEntry } from "../valueObject";

function areEntitiesEqual(a: FieldRight, b: FieldRight): boolean {
  return deepEqual(
    a.entities.map((e) => ({
      accessibility: e.accessibility,
      type: e.entity.type,
      code: e.entity.code,
      includeSubs: e.includeSubs,
    })),
    b.entities.map((e) => ({
      accessibility: e.accessibility,
      type: e.entity.type,
      code: e.entity.code,
      includeSubs: e.includeSubs,
    })),
  );
}

export const FieldPermissionDiffDetector = {
  detect: (local: FieldPermissionConfig, remote: FieldPermissionConfig) => {
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
      } else if (!areEntitiesEqual(localRight, remoteRight)) {
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

    return buildDiffResult(entries);
  },
};
