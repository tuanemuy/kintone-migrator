import type { DiffResult } from "../diff";

export type ActionDestApp = Readonly<{
  app?: string;
  code?: string;
}>;

export const SRC_TYPES = ["FIELD", "RECORD_URL"] as const;

export type ActionMappingSrcType = (typeof SRC_TYPES)[number];

const VALID_SRC_TYPES: ReadonlySet<string> = new Set(SRC_TYPES);

export function isActionMappingSrcType(
  value: string,
): value is ActionMappingSrcType {
  return VALID_SRC_TYPES.has(value);
}

export type ActionMapping = Readonly<{
  srcType: ActionMappingSrcType;
  srcField?: string;
  destField: string;
}>;

export const ENTITY_TYPES = ["USER", "GROUP", "ORGANIZATION"] as const;

export type ActionEntityType = (typeof ENTITY_TYPES)[number];

const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set(ENTITY_TYPES);

export function isActionEntityType(value: string): value is ActionEntityType {
  return VALID_ENTITY_TYPES.has(value);
}

export type ActionEntity = Readonly<{
  type: ActionEntityType;
  code: string;
}>;

export type ActionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  actionName: string;
  details: string;
}>;

export type ActionDiff = DiffResult<ActionDiffEntry>;
