import { buildDiffResult } from "../../diff";
import type { AppPermissionConfig, AppRight } from "../entity";
import type { AppPermissionDiff, AppPermissionDiffEntry } from "../valueObject";

const BOOLEAN_FLAGS = [
  "includeSubs",
  "appEditable",
  "recordViewable",
  "recordAddable",
  "recordEditable",
  "recordDeletable",
  "recordImportable",
  "recordExportable",
] as const satisfies readonly (keyof AppRight)[];

function entityKey(right: AppRight): string {
  return `${right.entity.type}:${right.entity.code}`;
}

function describeRight(right: AppRight): string {
  const flags = BOOLEAN_FLAGS.filter((f) => f !== "includeSubs" && right[f]);
  return flags.length > 0 ? flags.join(", ") : "no permissions";
}

function compareRights(local: AppRight, remote: AppRight): string[] {
  const diffs: string[] = [];
  for (const flag of BOOLEAN_FLAGS) {
    if (local[flag] !== remote[flag]) {
      diffs.push(`${flag}: ${String(remote[flag])} -> ${String(local[flag])}`);
    }
  }
  return diffs;
}

export const AppPermissionDiffDetector = {
  // Order-insensitive: app permissions are keyed by entity (type:code),
  // so insertion order does not affect semantics.
  detect: (
    local: AppPermissionConfig,
    remote: AppPermissionConfig,
  ): AppPermissionDiff => {
    const entries: AppPermissionDiffEntry[] = [];

    // kintone API guarantees entity keys are unique per app, so Map is safe here
    const localMap = new Map(local.rights.map((r) => [entityKey(r), r]));
    const remoteMap = new Map(remote.rights.map((r) => [entityKey(r), r]));

    for (const [key, localRight] of localMap) {
      const remoteRight = remoteMap.get(key);
      if (!remoteRight) {
        entries.push({
          type: "added",
          entityKey: key,
          details: describeRight(localRight),
        });
      } else {
        const diffs = compareRights(localRight, remoteRight);
        if (diffs.length > 0) {
          entries.push({
            type: "modified",
            entityKey: key,
            details: diffs.join(", "),
          });
        }
      }
    }

    for (const [key, remoteRight] of remoteMap) {
      if (!localMap.has(key)) {
        entries.push({
          type: "deleted",
          entityKey: key,
          details: describeRight(remoteRight),
        });
      }
    }

    return buildDiffResult(entries);
  },
};
