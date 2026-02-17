import type { ActionConfig } from "../entity";

export interface ActionConfigurator {
  getActions(): Promise<{
    actions: Readonly<Record<string, ActionConfig>>;
    revision: string;
  }>;
  updateActions(params: {
    actions: Readonly<Record<string, ActionConfig>>;
    revision?: string;
  }): Promise<{ revision: string }>;
}
