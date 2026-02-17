import type { ProcessAction, ProcessAssignee } from "./valueObject";

export type ProcessState = Readonly<{
  index: number;
  assignee: ProcessAssignee;
}>;

export type ProcessManagementConfig = Readonly<{
  enable: boolean;
  states: Readonly<Record<string, ProcessState>>;
  actions: readonly ProcessAction[];
}>;
