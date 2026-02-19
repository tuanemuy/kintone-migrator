export type ProcessEntityType =
  | "USER"
  | "GROUP"
  | "ORGANIZATION"
  | "FIELD_ENTITY"
  | "CREATOR"
  | "CUSTOM_FIELD";

export type ProcessAssigneeType = "ONE" | "ALL" | "ANY";

export type ProcessEntity = Readonly<{
  type: ProcessEntityType;
  code?: string;
  includeSubs?: boolean;
}>;

export type ProcessAssignee = Readonly<{
  type: ProcessAssigneeType;
  entities: readonly ProcessEntity[];
}>;

export type ProcessActionType = "PRIMARY" | "SECONDARY";

export type ProcessAction = Readonly<{
  name: string;
  from: string;
  to: string;
  filterCond: string;
  type: ProcessActionType;
  executableUser?: Readonly<{
    entities: readonly ProcessEntity[];
  }>;
}>;

// Diff types

export type ProcessManagementDiffType = "added" | "modified" | "deleted";

export type ProcessManagementDiffCategory = "enable" | "state" | "action";

export type ProcessManagementDiffEntry = Readonly<{
  type: ProcessManagementDiffType;
  category: ProcessManagementDiffCategory;
  name: string;
  details: string;
}>;

export type ProcessManagementDiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;

export type ProcessManagementDiff = Readonly<{
  entries: readonly ProcessManagementDiffEntry[];
  summary: ProcessManagementDiffSummary;
  isEmpty: boolean;
}>;
