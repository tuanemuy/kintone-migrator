import type { ActionDestApp, ActionEntity, ActionMapping } from "./valueObject";

export type ActionConfig = Readonly<{
  index: number;
  // name is derived from the YAML object key (e.g. "見積書を作成") and stored
  // redundantly for convenience — it allows consuming code to access the action
  // name without needing the parent record's key.
  name: string;
  destApp: ActionDestApp;
  mappings: readonly ActionMapping[];
  entities: readonly ActionEntity[];
  filterCond: string;
}>;

export type ActionsConfig = Readonly<{
  actions: Readonly<Record<string, ActionConfig>>;
}>;
