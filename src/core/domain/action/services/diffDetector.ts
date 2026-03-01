import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
import type { ActionConfig, ActionsConfig } from "../entity";
import type { ActionDiff, ActionDiffEntry } from "../valueObject";

function compareActions(local: ActionConfig, remote: ActionConfig): string[] {
  const diffs: string[] = [];

  if (local.index !== remote.index) {
    diffs.push(`index: ${remote.index} -> ${local.index}`);
  }
  if (local.name !== remote.name) {
    diffs.push(`name: "${remote.name}" -> "${local.name}"`);
  }
  if (!deepEqual(local.destApp, remote.destApp)) {
    diffs.push("destApp changed");
  }
  if (local.filterCond !== remote.filterCond) {
    diffs.push("filterCond changed");
  }
  if (!deepEqual(local.mappings, remote.mappings)) {
    if (local.mappings.length !== remote.mappings.length) {
      diffs.push(
        `mappings: ${remote.mappings.length} -> ${local.mappings.length}`,
      );
    } else {
      diffs.push("mappings changed");
    }
  }
  if (!deepEqual(local.entities, remote.entities)) {
    diffs.push("entities changed");
  }

  return diffs;
}

export const ActionDiffDetector = {
  detect: (local: ActionsConfig, remote: ActionsConfig): ActionDiff => {
    const entries: ActionDiffEntry[] = [];

    for (const [name, localAction] of Object.entries(local.actions)) {
      const remoteAction = remote.actions[name];
      if (!remoteAction) {
        entries.push({
          type: "added",
          actionName: name,
          details: `dest: ${localAction.destApp.app ?? localAction.destApp.code ?? "(unspecified)"}`,
        });
      } else {
        const diffs = compareActions(localAction, remoteAction);
        if (diffs.length > 0) {
          entries.push({
            type: "modified",
            actionName: name,
            details: diffs.join(", "),
          });
        }
      }
    }

    for (const [name, remoteAction] of Object.entries(remote.actions)) {
      if (!local.actions[name]) {
        entries.push({
          type: "deleted",
          actionName: name,
          details: `dest: ${remoteAction.destApp.app ?? remoteAction.destApp.code ?? "(unspecified)"}`,
        });
      }
    }

    return buildDiffResult(entries);
  },
};
