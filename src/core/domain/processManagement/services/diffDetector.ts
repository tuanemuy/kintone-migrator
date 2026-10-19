import { buildDiffResult } from "../../diff";
import { formatValue } from "../../services/formatValue";
import type { ProcessManagementConfig } from "../entity";
import {
  describeProcessAction,
  type ProcessAction,
  type ProcessEntity,
  type ProcessManagementDiff,
  type ProcessManagementDiffEntry,
} from "../valueObject";

function isEntityEqual(a: ProcessEntity, b: ProcessEntity): boolean {
  if (a.type !== b.type) return false;
  if ((a.code ?? "") !== (b.code ?? "")) return false;
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
    diffs.push(
      `executableUser: ${formatValue(remoteAction.executableUser)} -> ${formatValue(localAction.executableUser)}`,
    );
  }
  return diffs;
}

function compareStates(
  local: ProcessManagementConfig,
  remote: ProcessManagementConfig,
  entries: ProcessManagementDiffEntry[],
): void {
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
        stateDiffs.push(
          `assignee.entities: ${formatValue(remoteState.assignee.entities)} -> ${formatValue(localState.assignee.entities)}`,
        );
      }

      if (stateDiffs.length > 0) {
        entries.push({
          type: "modified",
          category: "state",
          name,
          details: stateDiffs.join("\n"),
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
}

type IdentifiedAction = Readonly<{
  label: string;
  action: ProcessAction;
}>;

/**
 * Keys actions by name + from + to plus the occurrence order within that
 * triple. kintone allows same-named actions both from different states and as
 * conditional branches from one state, so the name alone would collapse them.
 * The input may come from kintone or the state file without passing the
 * parser, so no uniqueness is assumed.
 */
function identifyActions(
  actions: readonly ProcessAction[],
): ReadonlyMap<string, IdentifiedAction> {
  const occurrences = new Map<string, number>();
  const identified = new Map<string, IdentifiedAction>();
  for (const action of actions) {
    const transitionKey = JSON.stringify([action.name, action.from, action.to]);
    const occurrence = (occurrences.get(transitionKey) ?? 0) + 1;
    occurrences.set(transitionKey, occurrence);
    const label = describeProcessAction(action);
    identified.set(`${transitionKey}#${occurrence}`, {
      label: occurrence === 1 ? label : `${label} #${occurrence}`,
      action,
    });
  }
  return identified;
}

function compareActionEntries(
  local: ProcessManagementConfig,
  remote: ProcessManagementConfig,
  entries: ProcessManagementDiffEntry[],
): void {
  const localActions = identifyActions(local.actions);
  const remoteActions = identifyActions(remote.actions);

  for (const [key, { label, action: localAction }] of localActions) {
    const remoteAction = remoteActions.get(key)?.action;
    if (!remoteAction) {
      entries.push({
        type: "added",
        category: "action",
        name: label,
        details: `filterCond: "${localAction.filterCond}"`,
      });
    } else {
      const actionDiffs = compareActions(localAction, remoteAction);
      if (actionDiffs.length > 0) {
        entries.push({
          type: "modified",
          category: "action",
          name: label,
          details: actionDiffs.join("\n"),
        });
      }
    }
  }

  for (const [key, { label, action: remoteAction }] of remoteActions) {
    if (!localActions.has(key)) {
      entries.push({
        type: "deleted",
        category: "action",
        name: label,
        details: `filterCond: "${remoteAction.filterCond}"`,
      });
    }
  }
}

function compareConfigs(
  local: ProcessManagementConfig,
  remote: ProcessManagementConfig,
): ProcessManagementDiffEntry[] {
  const entries: ProcessManagementDiffEntry[] = [];

  if (local.enable !== remote.enable) {
    entries.push({
      type: "modified",
      category: "enable",
      name: "enable",
      details: `${String(remote.enable)} -> ${String(local.enable)}`,
    });
  }

  compareStates(local, remote, entries);
  compareActionEntries(local, remote, entries);

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
