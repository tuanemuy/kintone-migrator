export type ActionDestApp = Readonly<{
  app?: string;
  code?: string;
}>;

export type ActionMappingSrcType = "FIELD" | "RECORD_URL";

export const VALID_SRC_TYPES: ReadonlySet<string> =
  new Set<ActionMappingSrcType>(["FIELD", "RECORD_URL"]);

export type ActionMapping = Readonly<{
  srcType: ActionMappingSrcType;
  srcField?: string;
  destField: string;
}>;

export type ActionEntityType = "USER" | "GROUP" | "ORGANIZATION";

export const VALID_ENTITY_TYPES: ReadonlySet<string> =
  new Set<ActionEntityType>(["USER", "GROUP", "ORGANIZATION"]);

export type ActionEntity = Readonly<{
  type: ActionEntityType;
  code: string;
}>;
