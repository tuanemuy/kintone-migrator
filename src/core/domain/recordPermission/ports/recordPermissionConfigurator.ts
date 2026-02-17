import type { RecordRight } from "../entity";

export interface RecordPermissionConfigurator {
  getRecordPermissions(): Promise<{
    rights: readonly RecordRight[];
    revision: string;
  }>;
  updateRecordPermissions(params: {
    rights: readonly RecordRight[];
    revision?: string;
  }): Promise<{ revision: string }>;
}
