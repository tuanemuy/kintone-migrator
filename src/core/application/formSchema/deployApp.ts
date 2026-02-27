import type { FormSchemaServiceArgs } from "../container/formSchema";

export async function deployApp({
  container,
}: FormSchemaServiceArgs): Promise<void> {
  await container.appDeployer.deploy();
}
