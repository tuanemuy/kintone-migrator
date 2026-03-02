import type { RecordRight } from "../entity";

export interface RecordPermissionConfigurator {
  getRecordPermissions(): Promise<{
    rights: readonly RecordRight[];
    /** Optimistic concurrency control token from kintone API. */
    revision: string;
  }>;
  updateRecordPermissions(params: {
    rights: readonly RecordRight[];
    /** Pass revision for optimistic concurrency control, or omit for forced write. */
    revision?: string;
  }): Promise<{ revision: string }>;
}
