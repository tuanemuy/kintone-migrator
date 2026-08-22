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
   *   Implementations must read `DEFAULT_FORM_READ_TARGET` when `target` is
   *   omitted. A TypeScript interface cannot declare a default value, so an
   *   implementation that ignores the parameter still satisfies this signature
   *   and no type error is raised -- the default is the implementer's duty.
   */
  getRawFormData(target?: FormReadTarget): Promise<RawFormDump>;
}
