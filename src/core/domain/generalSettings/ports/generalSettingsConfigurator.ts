import type { GeneralSettingsConfig } from "../entity";

export interface GeneralSettingsConfigurator {
  getGeneralSettings(): Promise<{
    config: GeneralSettingsConfig;
    /** Optimistic concurrency control token from kintone API. */
    revision: string;
  }>;
  updateGeneralSettings(params: {
    config: GeneralSettingsConfig;
    /** Pass revision for optimistic concurrency control, or omit for forced write. */
    revision?: string;
  }): Promise<{ revision: string }>;
}
