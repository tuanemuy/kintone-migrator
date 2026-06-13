import type { FormLayout } from "../entity";
import type { FieldCode, FieldDefinition } from "../valueObject";

/**
 * Sentinel passed as `expectedRevision` to explicitly skip the kintone revision
 * check (sends `-1` / omits the expected revision). Used by `--force` push so
 * that the apply succeeds even when the remote drifted (AC-9 / ADR-005 /
 * ADR-010). This is distinct from `undefined`, which means "use the adapter's
 * default tracked revision" (existing migrate behaviour).
 */
export const SKIP_REVISION_CHECK = Symbol("skip-revision-check");

/**
 * The expected revision to enforce on a mutation. Three states:
 * - `undefined`: no explicit revision — fall back to the adapter's tracked
 *   revision (migrate's existing behaviour).
 * - a revision string: enforce exactly this revision (push, TOCTOU guard).
 * - {@link SKIP_REVISION_CHECK}: skip the revision check entirely (`--force`
 *   push / first run).
 */
export type ExpectedRevision = string | typeof SKIP_REVISION_CHECK | undefined;

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
   * Mutation methods accept an {@link ExpectedRevision} with three distinct
   * states (see {@link ExpectedRevision} / {@link SKIP_REVISION_CHECK}):
   * - a revision string: enforce it so a concurrent change (TOCTOU) yields a
   *   409 conflict (push non-force, ADR-005).
   * - {@link SKIP_REVISION_CHECK}: skip the revision check (`--force` push /
   *   first run, AC-9).
   * - `undefined`: fall back to the adapter's tracked revision (migrate).
   */
  addFields(
    fields: readonly FieldDefinition[],
    expectedRevision?: ExpectedRevision,
  ): Promise<void>;
  updateFields(
    fields: readonly FieldDefinition[],
    expectedRevision?: ExpectedRevision,
  ): Promise<void>;
  deleteFields(
    fieldCodes: readonly FieldCode[],
    expectedRevision?: ExpectedRevision,
  ): Promise<void>;
  getLayout(): Promise<FormLayout>;
  updateLayout(
    layout: FormLayout,
    expectedRevision?: ExpectedRevision,
  ): Promise<void>;
}
