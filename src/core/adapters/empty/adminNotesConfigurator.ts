import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import type { AdminNotesConfigurator } from "@/core/domain/adminNotes/ports/adminNotesConfigurator";

export class EmptyAdminNotesConfigurator implements AdminNotesConfigurator {
  async getAdminNotes(): Promise<{
    config: AdminNotesConfig;
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyAdminNotesConfigurator.getAdminNotes not implemented",
    );
  }

  async updateAdminNotes(_params: {
    config: AdminNotesConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyAdminNotesConfigurator.updateAdminNotes not implemented",
    );
  }
}
