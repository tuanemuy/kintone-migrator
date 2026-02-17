import type { GeneralSettingsConfig } from "../entity";

export interface GeneralSettingsConfigurator {
  getGeneralSettings(): Promise<{
    config: GeneralSettingsConfig;
    revision: string;
  }>;
  updateGeneralSettings(params: {
    config: GeneralSettingsConfig;
    revision?: string;
  }): Promise<{ revision: string }>;
}
