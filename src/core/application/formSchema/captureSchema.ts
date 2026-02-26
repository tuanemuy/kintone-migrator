import { enrichLayoutWithFields } from "@/core/domain/formSchema/services/layoutEnricher";
import { SchemaSerializer } from "@/core/domain/formSchema/services/schemaSerializer";
import type { FormSchemaServiceArgs } from "../container/formSchema";
import type { CaptureSchemaOutput } from "./dto";

export async function captureSchema({
  container,
}: FormSchemaServiceArgs): Promise<CaptureSchemaOutput> {
  const [currentFields, currentLayout] = await Promise.all([
    container.formConfigurator.getFields(),
    container.formConfigurator.getLayout(),
  ]);
  const enrichedLayout = enrichLayoutWithFields(currentLayout, currentFields);
  const schemaText = SchemaSerializer.serialize(enrichedLayout);
  const existingResult = await container.schemaStorage.get();

  return {
    schemaText,
    hasExistingSchema: existingResult.exists,
  };
}
