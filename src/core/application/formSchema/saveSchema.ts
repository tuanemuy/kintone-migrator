import type { Container } from "../container";
import type { ServiceArgs } from "../types";

export type SaveSchemaInput = {
  readonly schemaText: string;
};

export async function saveSchema({
  container,
  input,
}: ServiceArgs<Container, SaveSchemaInput>): Promise<void> {
  await container.schemaStorage.update(input.schemaText);
}
