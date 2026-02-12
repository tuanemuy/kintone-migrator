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
  addFields(fields: readonly FieldDefinition[]): Promise<void>;
  updateFields(fields: readonly FieldDefinition[]): Promise<void>;
  deleteFields(fieldCodes: readonly FieldCode[]): Promise<void>;
  getLayout(): Promise<FormLayout>;
  updateLayout(layout: FormLayout): Promise<void>;
}
