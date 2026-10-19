import { pairByKeyInOrder } from "@/lib/pairByKeyInOrder";
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
      `filterCond: ${formatValue(remoteAction.filterCond)} -> ${formatValue(localAction.filterCond)}`,
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

/**
 * Identifies an action by name + from + to. kintone allows same-named actions
 * both from different states and as conditional branches from one state.
 * Repeats of the whole triple are not rejected either, so actions sharing a
 * triple are told apart by their order of appearance.
 */
function transitionKey(action: ProcessAction): string {
  return JSON.stringify([action.name, action.from, action.to]);
}

function actionLabel(action: ProcessAction, index: number): string {
  const label = describeProcessAction(action);
  return index === 0 ? label : `${label} #${index + 1}`;
}

function compareActionEntries(
  local: ProcessManagementConfig,
  remote: ProcessManagementConfig,
  entries: ProcessManagementDiffEntry[],
): void {
  for (const pair of pairByKeyInOrder(
    local.actions,
    remote.actions,
    transitionKey,
  )) {
    switch (pair.kind) {
      case "localOnly":
        entries.push({
          type: "added",
          category: "action",
          name: actionLabel(pair.local, pair.index),
          details: `filterCond: ${formatValue(pair.local.filterCond)}`,
        });
        break;
      case "remoteOnly":
        entries.push({
          type: "deleted",
          category: "action",
          name: actionLabel(pair.remote, pair.index),
          details: `filterCond: ${formatValue(pair.remote.filterCond)}`,
        });
        break;
      case "both": {
        const actionDiffs = compareActions(pair.local, pair.remote);
        if (actionDiffs.length > 0) {
          entries.push({
            type: "modified",
            category: "action",
            name: actionLabel(pair.local, pair.index),
            details: actionDiffs.join("\n"),
          });
        }
        break;
      }
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
