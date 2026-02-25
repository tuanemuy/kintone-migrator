import { collectSubtableInnerFieldCodes } from "@/core/domain/formSchema/services/layoutEnricher";
import type { FieldCode } from "@/core/domain/formSchema/valueObject";
import type { FormSchemaContainer } from "../container";
import type { ServiceArgs } from "../types";

export async function resetForm({
  container,
}: ServiceArgs<FormSchemaContainer>): Promise<void> {
  // System fields (RECORD_NUMBER, CREATOR, CREATED_TIME, MODIFIER,
  // UPDATED_TIME, CATEGORY, STATUS, STATUS_ASSIGNEE) are already excluded
  // by the FormConfigurator.getFields() port contract.
  const currentFields = await container.formConfigurator.getFields();
  const subtableInnerCodes = collectSubtableInnerFieldCodes(currentFields);

  const toDelete: FieldCode[] = [];
  for (const fieldCode of currentFields.keys()) {
    if (subtableInnerCodes.has(fieldCode)) continue;
    toDelete.push(fieldCode);
  }

  if (toDelete.length > 0) {
    await container.formConfigurator.deleteFields(toDelete);
  }

  await container.formConfigurator.updateLayout([]);
}
