import type { FieldRight } from "../entity";

export interface FieldPermissionConfigurator {
  getFieldPermissions(): Promise<{
    rights: readonly FieldRight[];
    revision: string;
  }>;
  updateFieldPermissions(params: {
    rights: readonly FieldRight[];
    revision?: string;
  }): Promise<{ revision: string }>;
}
