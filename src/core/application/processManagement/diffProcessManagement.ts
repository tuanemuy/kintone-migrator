import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import type { ProcessAction } from "@/core/domain/processManagement/valueObject";
import type { ProcessManagementServiceArgs } from "../container/processManagement";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseProcessManagementConfigText } from "./parseConfig";

export type ProcessManagementDiffEntry = {
  readonly type: "added" | "modified" | "deleted";
  readonly category: "enable" | "state" | "action";
  readonly name: string;
  readonly details: string;
};

export type DiffProcessManagementOutput = {
  readonly entries: readonly ProcessManagementDiffEntry[];
  readonly isEmpty: boolean;
  readonly summary: {
    readonly added: number;
    readonly modified: number;
    readonly deleted: number;
  };
};

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
    JSON.stringify(localAction.executableUser) !==
    JSON.stringify(remoteAction.executableUser)
  ) {
    diffs.push("executableUser changed");
  }
  return diffs;
}

function diffConfigs(
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
      const diffs: string[] = [];

      if (localState.index !== remoteState.index) {
        diffs.push(`index: ${remoteState.index} -> ${localState.index}`);
      }
      if (localState.assignee.type !== remoteState.assignee.type) {
        diffs.push(
          `assignee.type: ${remoteState.assignee.type} -> ${localState.assignee.type}`,
        );
      }
      if (
        JSON.stringify(localState.assignee.entities) !==
        JSON.stringify(remoteState.assignee.entities)
      ) {
        diffs.push("assignee.entities changed");
      }

      if (diffs.length > 0) {
        entries.push({
          type: "modified",
          category: "state",
          name,
          details: diffs.join(", "),
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
      const diffs = compareActions(localAction, remoteAction);
      if (diffs.length > 0) {
        entries.push({
          type: "modified",
          category: "action",
          name,
          details: diffs.join(", "),
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

export async function diffProcessManagement({
  container,
}: ProcessManagementServiceArgs): Promise<DiffProcessManagementOutput> {
  const result = await container.processManagementStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Process management config file not found",
    );
  }
  const localConfig = parseProcessManagementConfigText(result.content);

  const { config: remoteConfig } =
    await container.processManagementConfigurator.getProcessManagement();

  const entries = diffConfigs(localConfig, remoteConfig);

  return {
    entries,
    isEmpty: entries.length === 0,
    summary: {
      added: entries.filter((e) => e.type === "added").length,
      modified: entries.filter((e) => e.type === "modified").length,
      deleted: entries.filter((e) => e.type === "deleted").length,
    },
  };
}
