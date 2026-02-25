import type { FormSchemaContainer } from "../container";
import type { ServiceArgs } from "../types";

export async function deployApp({
  container,
}: ServiceArgs<FormSchemaContainer>): Promise<void> {
  await container.appDeployer.deploy();
}
