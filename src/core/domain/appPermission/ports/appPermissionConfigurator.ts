import type { AppRight } from "../entity";

export interface AppPermissionConfigurator {
  getAppPermissions(): Promise<{
    rights: readonly AppRight[];
    /** Optimistic concurrency control token from kintone API. */
    revision: string;
  }>;
  updateAppPermissions(params: {
    rights: readonly AppRight[];
    /** Pass revision for optimistic concurrency control, or omit for forced write. */
    revision?: string;
  }): Promise<{ revision: string }>;
}
