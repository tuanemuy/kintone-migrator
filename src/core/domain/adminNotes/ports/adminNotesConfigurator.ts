import type { AdminNotesConfig } from "../entity";

export interface AdminNotesConfigurator {
  getAdminNotes(): Promise<{
    config: AdminNotesConfig;
    revision: string;
  }>;
  updateAdminNotes(params: {
    config: AdminNotesConfig;
    revision?: string;
  }): Promise<{ revision: string }>;
}
