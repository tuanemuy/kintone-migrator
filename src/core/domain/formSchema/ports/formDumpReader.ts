import type { FormReadTarget } from "./formReadTarget";

/**
 * Port for reading raw form fields and layout JSON from kintone.
 *
 * Unlike {@link FormConfigurator} which returns typed domain objects,
 * this port returns the raw JSON responses suitable for dump/export.
 */
export type RawFormDump = {
  readonly fields: Record<string, unknown>;
  readonly layout: unknown;
};

export interface FormDumpReader {
  /**
   * Returns the raw fields/layout responses.
   *
   * @param target which generation to read. Defaults to `"preview"`.
   */
  getRawFormData(target?: FormReadTarget): Promise<RawFormDump>;
}
