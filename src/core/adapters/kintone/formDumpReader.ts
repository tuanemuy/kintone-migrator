import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import type {
  FormDumpReader,
  RawFormDump,
} from "@/core/domain/formSchema/ports/formDumpReader";
import { wrapKintoneError } from "./wrapKintoneError";

export class KintoneFormDumpReader implements FormDumpReader {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getRawFormData(): Promise<RawFormDump> {
    try {
      const [fields, layout] = await Promise.all([
        this.client.app.getFormFields({ app: this.appId, preview: true }),
        this.client.app.getFormLayout({ app: this.appId, preview: true }),
      ]);

      // Double cast through `unknown` is required because the SDK return types
      // do not match our RawFormDump shape (which is intentionally untyped for dump).
      return {
        fields: fields as unknown as Record<string, unknown>,
        layout: layout as unknown,
      };
    } catch (error) {
      wrapKintoneError(error, "Failed to fetch raw form data for dump");
    }
  }
}
