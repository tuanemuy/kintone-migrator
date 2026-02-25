import type { FormSchemaContainer } from "../container";
import type { ServiceArgs } from "../types";

export type SaveSchemaInput = {
  readonly schemaText: string;
};

export async function saveSchema({
  container,
  input,
}: ServiceArgs<FormSchemaContainer, SaveSchemaInput>): Promise<void> {
  await container.schemaStorage.update(input.schemaText);
}
