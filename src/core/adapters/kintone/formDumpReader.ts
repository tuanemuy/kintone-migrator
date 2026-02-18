import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type {
  FormDumpReader,
  RawFormDump,
} from "@/core/domain/formSchema/ports/formDumpReader";

export class KintoneFormDumpReader implements FormDumpReader {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getRawFormData(): Promise<RawFormDump> {
    try {
      const [fields, layout] = await Promise.all([
        this.client.app.getFormFields({ app: this.appId }),
        this.client.app.getFormLayout({ app: this.appId }),
      ]);

      return {
        fields: fields as unknown as Record<string, unknown>,
        layout: layout as unknown as Record<string, unknown>,
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to fetch raw form data for dump",
        error,
      );
    }
  }
}
