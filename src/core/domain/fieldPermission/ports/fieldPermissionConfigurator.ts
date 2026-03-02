import type { FieldRight } from "../entity";

export interface FieldPermissionConfigurator {
  getFieldPermissions(): Promise<{
    rights: readonly FieldRight[];
    /** Optimistic concurrency control token from kintone API. */
    revision: string;
  }>;
  updateFieldPermissions(params: {
    rights: readonly FieldRight[];
    /** Pass revision for optimistic concurrency control, or omit for forced write. */
    revision?: string;
  }): Promise<{ revision: string }>;
}
