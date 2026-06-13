import type { FormLayout } from "../entity";
import type { FieldCode, FieldDefinition } from "../valueObject";

/**
 * Port for managing kintone form field configurations.
 *
 * Implementations must exclude system fields (e.g. RECORD_NUMBER, CREATOR,
 * MODIFIER, CREATED_TIME, UPDATED_TIME, STATUS, etc.) from the results of
 * {@link getFields} and from the inputs of mutation methods. The `FieldType`
 * union does not include system field types, so the type system enforces this
 * at the domain boundary, but adapter implementations are responsible for
 * filtering them out when communicating with the kintone API.
 */
export interface FormConfigurator {
  /** Returns all non-system fields currently configured in the form. */
  getFields(): Promise<ReadonlyMap<FieldCode, FieldDefinition>>;
  /**
   * Returns the current app (preview) revision in a single API call.
   *
   * Used as the source of the expected revision for push (TOCTOU guard) and as
   * a first-line drift signal. The final drift judgement is made by comparing
   * snapshots, so this value never short-circuits snapshot fetching (ADR-004).
   */
  getRevision(): Promise<string>;
  /**
   * Mutation methods accept an optional `expectedRevision`. When provided, it is
   * sent to the kintone API as the expected revision so that a concurrent change
   * (TOCTOU) results in a 409 conflict (ADR-005). When omitted, the adapter does
   * not enforce a revision check (kintone's `-1` / revision-skip behaviour),
   * which is what `--force` push relies on.
   */
  addFields(
    fields: readonly FieldDefinition[],
    expectedRevision?: string,
  ): Promise<void>;
  updateFields(
    fields: readonly FieldDefinition[],
    expectedRevision?: string,
  ): Promise<void>;
  deleteFields(
    fieldCodes: readonly FieldCode[],
    expectedRevision?: string,
  ): Promise<void>;
  getLayout(): Promise<FormLayout>;
  updateLayout(layout: FormLayout, expectedRevision?: string): Promise<void>;
}
