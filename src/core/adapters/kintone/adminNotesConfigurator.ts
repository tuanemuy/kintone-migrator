import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import type { AdminNotesConfigurator } from "@/core/domain/adminNotes/ports/adminNotesConfigurator";
import { isBusinessRuleError } from "@/core/domain/error";

export class KintoneAdminNotesConfigurator implements AdminNotesConfigurator {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getAdminNotes(): Promise<{
    config: AdminNotesConfig;
    revision: string;
  }> {
    try {
      const response = await this.client.app.getAdminNotes({
        app: this.appId,
        preview: true,
      });

      return {
        config: {
          content: response.content as string,
          includeInTemplateAndDuplicates:
            response.includeInTemplateAndDuplicates as boolean,
        },
        revision: response.revision as string,
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get admin notes",
        error,
      );
    }
  }

  async updateAdminNotes(params: {
    config: AdminNotesConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const requestParams: Record<string, unknown> = {
        app: this.appId,
        content: params.config.content,
        includeInTemplateAndDuplicates:
          params.config.includeInTemplateAndDuplicates,
      };

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updateAdminNotes(
        requestParams as Parameters<typeof this.client.app.updateAdminNotes>[0],
      );

      return { revision: response.revision as string };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update admin notes",
        error,
      );
    }
  }
}
