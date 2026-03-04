import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import type { AdminNotesConfigurator } from "@/core/domain/adminNotes/ports/adminNotesConfigurator";
import { wrapKintoneError } from "./wrapKintoneError";

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
      throw wrapKintoneError(error, "Failed to get admin notes");
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
      throw wrapKintoneError(error, "Failed to update admin notes");
    }
  }
}
