import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import type {
  FormDumpReader,
  RawFormDump,
} from "@/core/domain/formSchema/ports/formDumpReader";
import type { FormReadTarget } from "@/core/domain/formSchema/ports/formReadTarget";
import { DEFAULT_FORM_READ_TARGET } from "@/core/domain/formSchema/ports/formReadTarget";
import { wrapKintoneError } from "./wrapKintoneError";

export class KintoneFormDumpReader implements FormDumpReader {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getRawFormData(
    target: FormReadTarget = DEFAULT_FORM_READ_TARGET,
  ): Promise<RawFormDump> {
    const preview = target === "preview";
    try {
      const [fields, layout] = await Promise.all([
        this.client.app.getFormFields({ app: this.appId, preview }),
        this.client.app.getFormLayout({ app: this.appId, preview }),
      ]);

      // Double cast through `unknown` is required because the SDK return types
      // do not match our RawFormDump shape (which is intentionally untyped for dump).
      return {
        fields: fields as unknown as Record<string, unknown>,
        layout: layout as unknown,
      };
    } catch (error) {
      throw wrapKintoneError(
        error,
        target === "published"
          ? "Failed to fetch published raw form data for dump (the app may not be deployed yet)"
          : "Failed to fetch raw form data for dump",
      );
    }
  }
}
