import type { AppRight } from "../entity";

export interface AppPermissionConfigurator {
  getAppPermissions(): Promise<{
    rights: readonly AppRight[];
    revision: string;
  }>;
  updateAppPermissions(params: {
    rights: readonly AppRight[];
    revision?: string;
  }): Promise<{ revision: string }>;
}
