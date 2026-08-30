import type { FormLayout } from "../entity";
import type { FieldCode, FieldDefinition } from "../valueObject";
import type { FormReadTarget } from "./formReadTarget";

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
 *
 * Read methods ({@link FormConfigurator.getFields} /
 * {@link FormConfigurator.getLayout}) accept a {@link FormReadTarget} so the
 * caller decides which generation to read; omitting it reads the preview.
 * Mutation methods always target the preview generation, because that is the
 * only generation the kintone form API can modify.
 */
export interface FormConfigurator {
  /**
   * Returns all non-system fields currently configured in the form.
   *
   * @param target which generation to read. Defaults to `"preview"`.
   *   Implementations must read `DEFAULT_FORM_READ_TARGET` when `target` is
   *   omitted. A TypeScript interface cannot declare a default value, so an
   *   implementation that ignores the parameter still satisfies this signature
   *   and no type error is raised -- the default is the implementer's duty.
   */
  getFields(
    target?: FormReadTarget,
  ): Promise<ReadonlyMap<FieldCode, FieldDefinition>>;
  /**
   * Returns the current app (preview) revision in a single API call.
   *
   * Used as the source of the expected revision for push (TOCTOU guard) and as
   * a first-line drift signal. The final drift judgement is made by comparing
   * snapshots, so this value never short-circuits snapshot fetching (ADR-004).
   *
   * Deliberately has no {@link FormReadTarget}: both consumers (the mutation
   * TOCTOU guard and the 3-way base revision) are only meaningful against the
   * preview generation, so a published revision must never reach this path.
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
   *
   * Mutations always apply to the preview generation.
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
  /**
   * Returns the form layout.
   *
   * @param target which generation to read. Defaults to `"preview"`.
   *   Implementations must read `DEFAULT_FORM_READ_TARGET` when `target` is
   *   omitted. A TypeScript interface cannot declare a default value, so an
   *   implementation that ignores the parameter still satisfies this signature
   *   and no type error is raised -- the default is the implementer's duty.
   */
  getLayout(target?: FormReadTarget): Promise<FormLayout>;
  updateLayout(
    layout: FormLayout,
    expectedRevision?: ExpectedRevision,
  ): Promise<void>;
}
