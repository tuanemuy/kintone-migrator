import { enrichLayoutWithFields } from "@/core/domain/formSchema/entity";
import { SchemaSerializer } from "@/core/domain/formSchema/services/schemaSerializer";
import type { Container } from "../container";
import type { ServiceArgs } from "../types";
import type { CaptureSchemaOutput } from "./dto";

export async function captureSchema({
  container,
}: ServiceArgs<Container>): Promise<CaptureSchemaOutput> {
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
