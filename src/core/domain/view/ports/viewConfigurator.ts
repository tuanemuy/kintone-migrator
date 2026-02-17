import type { ViewConfig } from "../entity";

export interface ViewConfigurator {
  getViews(): Promise<{
    views: Readonly<Record<string, ViewConfig>>;
    revision: string;
  }>;
  updateViews(params: {
    views: Readonly<Record<string, ViewConfig>>;
    revision?: string;
  }): Promise<{ revision: string }>;
}
