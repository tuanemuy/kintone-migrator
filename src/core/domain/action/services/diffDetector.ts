import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
import { detectRecordDiff } from "../../services/recordDiffDetector";
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

function destAppLabel(action: ActionConfig): string {
  return `dest: ${action.destApp.app ?? action.destApp.code ?? "(unspecified)"}`;
}

export const ActionDiffDetector = {
  detect: (local: ActionsConfig, remote: ActionsConfig): ActionDiff => {
    const entries = detectRecordDiff<ActionConfig, ActionDiffEntry>(
      local.actions,
      remote.actions,
      {
        onAdded: (name, localAction) => ({
          type: "added",
          actionName: name,
          details: destAppLabel(localAction),
        }),
        onModified: (name, localAction, remoteAction) => {
          const diffs = compareActions(localAction, remoteAction);
          if (diffs.length > 0) {
            return {
              type: "modified",
              actionName: name,
              details: diffs.join(", "),
            };
          }
          return undefined;
        },
        onDeleted: (name, remoteAction) => ({
          type: "deleted",
          actionName: name,
          details: destAppLabel(remoteAction),
        }),
      },
    );

    return buildDiffResult(entries);
  },
};
