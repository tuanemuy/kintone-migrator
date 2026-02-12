import { enrichLayoutWithFields } from "@/core/domain/formSchema/entity";
import { SchemaSerializer } from "@/core/domain/formSchema/services/schemaSerializer";
import type { ServiceArgs } from "../types";
import type { CaptureSchemaOutput } from "./dto";

export async function captureSchema({
  container,
}: ServiceArgs): Promise<CaptureSchemaOutput> {
  const [currentFields, currentLayout] = await Promise.all([
    container.formConfigurator.getFields(),
    container.formConfigurator.getLayout(),
  ]);
  const enrichedLayout = enrichLayoutWithFields(currentLayout, currentFields);
  const schemaText = SchemaSerializer.serialize(enrichedLayout);
  const existingText = await container.schemaStorage.get();

  return {
    schemaText,
    hasExistingSchema: existingText.length > 0,
  };
}
