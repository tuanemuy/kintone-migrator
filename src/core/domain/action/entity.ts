import type { ActionDestApp, ActionEntity, ActionMapping } from "./valueObject";

export type ActionConfig = Readonly<{
  index: number;
  name: string;
  destApp: ActionDestApp;
  mappings: readonly ActionMapping[];
  entities: readonly ActionEntity[];
  filterCond: string;
}>;

export type ActionsConfig = Readonly<{
  actions: Readonly<Record<string, ActionConfig>>;
}>;
