import type { FormSchemaServiceArgs } from "../container/formSchema";

export type SaveSchemaInput = {
  readonly schemaText: string;
};

export async function saveSchema({
  container,
  input,
}: FormSchemaServiceArgs<SaveSchemaInput>): Promise<void> {
  await container.schemaStorage.update(input.schemaText);
}
