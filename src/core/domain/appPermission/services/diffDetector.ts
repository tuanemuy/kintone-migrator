import { buildDiffResult } from "../../diff";
import type { AppPermissionConfig, AppRight } from "../entity";
import type { AppPermissionDiffEntry } from "../valueObject";

function entityKey(right: AppRight): string {
  return `${right.entity.type}:${right.entity.code}`;
}

function describeRight(right: AppRight): string {
  const flags: string[] = [];
  if (right.appEditable) flags.push("appEditable");
  if (right.recordViewable) flags.push("recordViewable");
  if (right.recordAddable) flags.push("recordAddable");
  if (right.recordEditable) flags.push("recordEditable");
  if (right.recordDeletable) flags.push("recordDeletable");
  if (right.recordImportable) flags.push("recordImportable");
  if (right.recordExportable) flags.push("recordExportable");
  return flags.length > 0 ? flags.join(", ") : "no permissions";
}

function compareRights(local: AppRight, remote: AppRight): string[] {
  const diffs: string[] = [];

  if (local.includeSubs !== remote.includeSubs) {
    diffs.push(
      `includeSubs: ${String(remote.includeSubs)} -> ${String(local.includeSubs)}`,
    );
  }
  if (local.appEditable !== remote.appEditable) {
    diffs.push(
      `appEditable: ${String(remote.appEditable)} -> ${String(local.appEditable)}`,
    );
  }
  if (local.recordViewable !== remote.recordViewable) {
    diffs.push(
      `recordViewable: ${String(remote.recordViewable)} -> ${String(local.recordViewable)}`,
    );
  }
  if (local.recordAddable !== remote.recordAddable) {
    diffs.push(
      `recordAddable: ${String(remote.recordAddable)} -> ${String(local.recordAddable)}`,
    );
  }
  if (local.recordEditable !== remote.recordEditable) {
    diffs.push(
      `recordEditable: ${String(remote.recordEditable)} -> ${String(local.recordEditable)}`,
    );
  }
  if (local.recordDeletable !== remote.recordDeletable) {
    diffs.push(
      `recordDeletable: ${String(remote.recordDeletable)} -> ${String(local.recordDeletable)}`,
    );
  }
  if (local.recordImportable !== remote.recordImportable) {
    diffs.push(
      `recordImportable: ${String(remote.recordImportable)} -> ${String(local.recordImportable)}`,
    );
  }
  if (local.recordExportable !== remote.recordExportable) {
    diffs.push(
      `recordExportable: ${String(remote.recordExportable)} -> ${String(local.recordExportable)}`,
    );
  }

  return diffs;
}

export const AppPermissionDiffDetector = {
  detect: (local: AppPermissionConfig, remote: AppPermissionConfig) => {
    const entries: AppPermissionDiffEntry[] = [];

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
