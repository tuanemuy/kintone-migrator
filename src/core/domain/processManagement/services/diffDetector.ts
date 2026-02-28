import { buildDiffResult } from "../../diff";
import type { ProcessManagementConfig } from "../entity";
import type {
  ProcessAction,
  ProcessEntity,
  ProcessManagementDiff,
  ProcessManagementDiffEntry,
} from "../valueObject";

function isEntityEqual(a: ProcessEntity, b: ProcessEntity): boolean {
  if (a.type !== b.type) return false;
  if (a.code !== b.code) return false;
  if (Boolean(a.includeSubs) !== Boolean(b.includeSubs)) return false;
  return true;
}

// Order-sensitive comparison: kintone API preserves entity order,
// and reordering entities may reflect intentional priority changes.
function isEntitiesEqual(
  a: readonly ProcessEntity[],
  b: readonly ProcessEntity[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!isEntityEqual(a[i], b[i])) return false;
  }
  return true;
}

function isExecutableUserEqual(
  a: ProcessAction["executableUser"],
  b: ProcessAction["executableUser"],
): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return isEntitiesEqual(a.entities, b.entities);
}

function compareActions(
  localAction: ProcessAction,
  remoteAction: ProcessAction,
): string[] {
  const diffs: string[] = [];
  if (localAction.from !== remoteAction.from) {
    diffs.push(`from: ${remoteAction.from} -> ${localAction.from}`);
  }
  if (localAction.to !== remoteAction.to) {
    diffs.push(`to: ${remoteAction.to} -> ${localAction.to}`);
  }
  if (localAction.filterCond !== remoteAction.filterCond) {
    diffs.push(
      `filterCond: "${remoteAction.filterCond}" -> "${localAction.filterCond}"`,
    );
  }
  if (localAction.type !== remoteAction.type) {
    diffs.push(`type: ${remoteAction.type} -> ${localAction.type}`);
  }
  if (
    !isExecutableUserEqual(
      localAction.executableUser,
      remoteAction.executableUser,
    )
  ) {
    diffs.push("executableUser changed");
  }
  return diffs;
}

function compareConfigs(
  local: ProcessManagementConfig,
  remote: ProcessManagementConfig,
): ProcessManagementDiffEntry[] {
  const entries: ProcessManagementDiffEntry[] = [];

  // Compare enable flag
  if (local.enable !== remote.enable) {
    entries.push({
      type: "modified",
      category: "enable",
      name: "enable",
      details: `${String(remote.enable)} -> ${String(local.enable)}`,
    });
  }

  // Compare states
  const localStateNames = new Set(Object.keys(local.states));
  const remoteStateNames = new Set(Object.keys(remote.states));

  for (const name of localStateNames) {
    if (!remoteStateNames.has(name)) {
      entries.push({
        type: "added",
        category: "state",
        name,
        details: `assignee: ${local.states[name].assignee.type}`,
      });
    } else {
      const localState = local.states[name];
      const remoteState = remote.states[name];
      const stateDiffs: string[] = [];

      if (localState.index !== remoteState.index) {
        stateDiffs.push(`index: ${remoteState.index} -> ${localState.index}`);
      }
      if (localState.assignee.type !== remoteState.assignee.type) {
        stateDiffs.push(
          `assignee.type: ${remoteState.assignee.type} -> ${localState.assignee.type}`,
        );
      }
      if (
        !isEntitiesEqual(
          localState.assignee.entities,
          remoteState.assignee.entities,
        )
      ) {
        stateDiffs.push("assignee.entities changed");
      }

      if (stateDiffs.length > 0) {
        entries.push({
          type: "modified",
          category: "state",
          name,
          details: stateDiffs.join(", "),
        });
      }
    }
  }

  for (const name of remoteStateNames) {
    if (!localStateNames.has(name)) {
      entries.push({
        type: "deleted",
        category: "state",
        name,
        details: `assignee: ${remote.states[name].assignee.type}`,
      });
    }
  }

  // Compare actions (keyed by name)
  const localActionMap = new Map(local.actions.map((a) => [a.name, a]));
  const remoteActionMap = new Map(remote.actions.map((a) => [a.name, a]));

  for (const [name, localAction] of localActionMap) {
    const remoteAction = remoteActionMap.get(name);
    if (!remoteAction) {
      entries.push({
        type: "added",
        category: "action",
        name,
        details: `${localAction.from} -> ${localAction.to}`,
      });
    } else {
      const actionDiffs = compareActions(localAction, remoteAction);
      if (actionDiffs.length > 0) {
        entries.push({
          type: "modified",
          category: "action",
          name,
          details: actionDiffs.join(", "),
        });
      }
    }
  }

  for (const [name, remoteAction] of remoteActionMap) {
    if (!localActionMap.has(name)) {
      entries.push({
        type: "deleted",
        category: "action",
        name,
        details: `${remoteAction.from} -> ${remoteAction.to}`,
      });
    }
  }

  return entries;
}

export const ProcessManagementDiffDetector = {
  detect: (
    local: ProcessManagementConfig,
    remote: ProcessManagementConfig,
  ): ProcessManagementDiff => {
    const entries = compareConfigs(local, remote);
    return buildDiffResult(entries);
  },
};
