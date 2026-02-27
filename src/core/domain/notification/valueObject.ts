export type NotificationEntityType =
  | "USER"
  | "GROUP"
  | "ORGANIZATION"
  | "FIELD_ENTITY";

export type NotificationEntity = Readonly<{
  type: NotificationEntityType;
  code: string;
}>;

// Diff types

export type NotificationDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  section: "general" | "perRecord" | "reminder";
  name: string;
  details: string;
}>;

export type NotificationDiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;

export type NotificationDiff = Readonly<{
  entries: readonly NotificationDiffEntry[];
  summary: NotificationDiffSummary;
  isEmpty: boolean;
}>;
