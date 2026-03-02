import type { AdminNotesConfig } from "../entity";

export interface AdminNotesConfigurator {
  getAdminNotes(): Promise<{
    config: AdminNotesConfig;
    /** Optimistic concurrency control token from kintone API. */
    revision: string;
  }>;
  updateAdminNotes(params: {
    config: AdminNotesConfig;
    /** Pass revision for optimistic concurrency control, or omit for forced write. */
    revision?: string;
  }): Promise<{ revision: string }>;
}
