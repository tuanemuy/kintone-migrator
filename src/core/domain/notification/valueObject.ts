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

import type { DiffResult } from "../diff";

export type NotificationDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  section: "general" | "perRecord" | "reminder";
  name: string;
  details: string;
}>;

export type NotificationDiff = DiffResult<NotificationDiffEntry>;
