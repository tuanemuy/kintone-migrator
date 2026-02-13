import { collectSubtableInnerFieldCodes } from "@/core/domain/formSchema/entity";
import type { FieldCode } from "@/core/domain/formSchema/valueObject";
import type { ServiceArgs } from "../types";

export async function resetForm({ container }: ServiceArgs): Promise<void> {
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
