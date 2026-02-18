/**
 * Port for reading raw form fields and layout JSON from kintone.
 *
 * Unlike {@link FormConfigurator} which returns typed domain objects,
 * this port returns the raw JSON responses suitable for dump/export.
 */
export type RawFormDump = {
  readonly fields: Record<string, unknown>;
  readonly layout: Record<string, unknown>;
};

export interface FormDumpReader {
  getRawFormData(): Promise<RawFormDump>;
}
