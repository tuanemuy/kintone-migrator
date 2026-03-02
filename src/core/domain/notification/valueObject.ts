import type { DiffResult } from "../diff";

// kintone REST API returns these entity types for notification recipients.
// FIELD_ENTITY represents a user field on the form (e.g. "作成者", "担当者").
// Validation is done at parse time; the kintone API itself rejects unknown types.
export const ENTITY_TYPES = [
  "USER",
  "GROUP",
  "ORGANIZATION",
  "FIELD_ENTITY",
] as const;

export type NotificationEntityType = (typeof ENTITY_TYPES)[number];

const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set(ENTITY_TYPES);

export function isNotificationEntityType(
  value: string,
): value is NotificationEntityType {
  return VALID_ENTITY_TYPES.has(value);
}

export type NotificationEntity = Readonly<{
  type: NotificationEntityType;
  code: string;
}>;

export type NotificationDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  section: "general" | "perRecord" | "reminder";
  name: string;
  details: string;
}>;

export type NotificationDiff = DiffResult<NotificationDiffEntry>;
