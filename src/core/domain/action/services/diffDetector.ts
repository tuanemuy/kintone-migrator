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
  if (JSON.stringify(local.destApp) !== JSON.stringify(remote.destApp)) {
    diffs.push("destApp changed");
  }
  if (local.filterCond !== remote.filterCond) {
    diffs.push("filterCond changed");
  }
  if (JSON.stringify(local.mappings) !== JSON.stringify(remote.mappings)) {
    diffs.push(
      `mappings changed (${local.mappings.length} local, ${remote.mappings.length} remote)`,
    );
  }
  if (JSON.stringify(local.entities) !== JSON.stringify(remote.entities)) {
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
          details: `dest: ${localAction.destApp.app ?? localAction.destApp.code ?? "unknown"}`,
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
          details: `dest: ${remoteAction.destApp.app ?? remoteAction.destApp.code ?? "unknown"}`,
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
